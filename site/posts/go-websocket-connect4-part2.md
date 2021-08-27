---
title: Making a multiplayer game with Go & WebSockets - Part 2
description: Part 2 of Making a multiplayer game with Go & WebSockets while learning to gopher
date: 2021-08-25
---

Day 2, recovering slowly. Again I will pass time by fiddling with Go. Continuing on from [Part 1](/posts/go-websocket-connect4-part1/).

I'm making a web UI that can connect with the WebSocket server using Go HTML templating and JavaScript.

First we actually need to be able to serve a page from the server. I'm going to write the test to cover this basic requirement:

```go
func TestHttpServer(t *testing.T) {
	t.Run("Will get expected response when making a GET request to '/'", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		resRecorder := httptest.NewRecorder()

		httpHandler(resRecorder, req)

		if resRecorder.Code != http.StatusOK {
			t.Errorf("Expected status '%d', got '%d'", http.StatusOK, resRecorder.Code)
		}
	})
}
```

We need to define this handler just as we did in my previous post, and while we're at it let's also rename the current handler for WebSocket connections to `wsHandler` so we can be more clear what that specific handler is used for, don't forget to change the reference in the test too.

```go
func httpHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Hello world!</h1>
      </body>
    </html>
  `)
}
```

We should be getting a 200 status code, and the test should be passing as is. But we should also check that the body we get back is what we expect:

```go
func TestHttpServer(t *testing.T) {
	t.Run("Will get expected response when making a GET request to '/'", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		resRecorder := httptest.NewRecorder()

		const expectedBody = `
      <!DOCTYPE html>
      <html>
        <body>
          <h1>Hello world!</h1>
        </body>
      </html>`

		httpHandler(resRecorder, req)

		if resRecorder.Code != http.StatusOK {
			t.Errorf("Expected status '%d', got '%d'", http.StatusOK, resRecorder.Code)
		}

		if strings.Compare(resRecorder.Body.String(), expectedBody) != 0 {
			t.Errorf("Expected body to be '%s', got '%s'", expectedBody, resRecorder.Body)
		}
	})
}
```

It looks right, but our test is failing because it's not exactly right... we need to make sure the whitespace is exactly the same. I commonly make this mistake whenever I work with multiline string literals. The test should pass after these changes:

```go
fmt.Fprintf(w, `<!DOCTYPE html>
<html>
  <body>
    <h1>Hello world!</h1>
  </body>
</html>`)
```

```go
const expectedBody = `<!DOCTYPE html>
<html>
  <body>
    <h1>Hello world!</h1>
  </body>
</html>`
```

We can modify the existing code to use the [`html/template`](https://pkg.go.dev/html/template) module:

{% raw %}
```go
func httpHandler(w http.ResponseWriter, r *http.Request) {
	tmpl := template.Must(template.New("").Parse(`<!DOCTYPE html>
<html>
  <body>
    <h1>{{.}}</h1>
  </body>
</html>`))
	tmpl.Execute(w, "Hello world!")
}
```

This test will still pass which means our template is still producing the expected output, and you may have noticed that we are injecting our "Hello world!" into the header tag where the `{{.}}` is.
{% endraw %}

Now let's make a page with a button that will connect to the WebSocket server when pressed, later this can be used to put the client into a matchmaking state and hopefully to connect us to a room with another available player, I like to get the core functionality down, trying to make it look pretty comes last:

```html
```

We need to inject the URL for the WebSocket server into our template:
