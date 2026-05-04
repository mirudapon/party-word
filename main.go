package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"

	copilot "github.com/github/copilot-sdk/go"
)

var (
	client  *copilot.Client
	session *copilot.Session
	mu      sync.Mutex
)

type GenerateRequest struct {
	Count    int      `json:"count"`
	Category []string `json:"category"`
}

type GenerateResponse struct {
	Words []string `json:"words"`
	Error string   `json:"error,omitempty"`
}

func initCopilot() error {
	client = copilot.NewClient(&copilot.ClientOptions{
		LogLevel: "error",
	})

	if err := client.Start(context.Background()); err != nil {
		return fmt.Errorf("failed to start copilot client: %w", err)
	}

	var err error
	session, err = client.CreateSession(context.Background(), &copilot.SessionConfig{
		// Model:               "gpt-5",
		OnPermissionRequest: copilot.PermissionHandler.ApproveAll,
	})
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}

	return nil
}

func pingPongHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(200)
	w.Write([]byte("pong"))
}

func generateWordHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, GenerateResponse{Error: "invalid request body"})
		return
	}

	if req.Count <= 0 {
		req.Count = 10
	}
	if len(req.Category) == 0 {
		req.Category = []string{"動作", "動物", "食物", "物品", "地點", "人物"}
	}

	prompt := fmt.Sprintf(
		"請生成 %d 個適合派對猜詞遊戲的繁體中文詞語，類別為：%s。"+
			"只回傳 JSON 陣列格式，不要任何其他文字，例如：[\"詞語1\",\"詞語2\"]",
		req.Count, strings.Join(req.Category, "、"),
	)

	mu.Lock()
	defer mu.Unlock()

	var chunks []string
	done := make(chan struct{})

	session.On(func(event copilot.SessionEvent) {
		switch d := event.Data.(type) {
		case *copilot.AssistantMessageData:
			chunks = append(chunks, d.Content)
		case *copilot.SessionIdleData:
			close(done)
		}
	})

	_, err := session.Send(context.Background(), copilot.MessageOptions{
		Prompt: prompt,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, GenerateResponse{Error: err.Error()})
		return
	}

	<-done

	reply := strings.Join(chunks, "")

	// Try to parse the reply as a JSON array of strings
	var words []string
	if err := json.Unmarshal([]byte(reply), &words); err != nil {
		// If parsing fails, return the raw reply as a single-element array
		words = []string{reply}
	}

	writeJSON(w, http.StatusOK, GenerateResponse{Words: words})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func main() {
	if err := initCopilot(); err != nil {
		log.Fatal(err)
	}
	defer client.Stop()
	defer session.Disconnect()

	// API route
	http.HandleFunc("/generate", generateWordHandler)
	http.HandleFunc("/ping", pingPongHandler)

	// Serve static files from public/
	http.Handle("/", http.FileServer(http.Dir("public")))

	fmt.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
