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

type WordItem struct {
	Word    string `json:"word"`
	English string `json:"english"`
}

type GenerateResponse struct {
	Words []WordItem `json:"words"`
	Error string     `json:"error,omitempty"`
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
			"每個詞語需要附上英文翻譯和詞性。"+
			"只回傳 JSON 陣列格式，不要任何其他文字，例如："+
			"[{\"word\":\"貓\",\"english\":\"n. cat\"},{\"word\":\"跑步\",\"english\":\"v. run\"}]",
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
	// Strip markdown code fences if present
	reply = strings.TrimSpace(reply)
	if strings.HasPrefix(reply, "```") {
		lines := strings.Split(reply, "\n")
		// Remove first line (```json) and last line (```)
		if len(lines) > 2 {
			lines = lines[1 : len(lines)-1]
		}
		reply = strings.TrimSpace(strings.Join(lines, "\n"))
	}

	// Try to parse the reply as a JSON array of WordItem objects
	var words []WordItem
	if err := json.Unmarshal([]byte(reply), &words); err != nil {
		// Fallback: try parsing as simple string array for backwards compatibility
		var simpleWords []string
		if err2 := json.Unmarshal([]byte(reply), &simpleWords); err2 != nil {
			words = []WordItem{{Word: reply, English: ""}}
		} else {
			for _, w := range simpleWords {
				words = append(words, WordItem{Word: w, English: ""})
			}
		}
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
