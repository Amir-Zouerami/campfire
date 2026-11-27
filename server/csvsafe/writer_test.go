package csvsafe

import (
	"bytes"
	"testing"
)

func TestWriterNeutralisesFormulas(t *testing.T) {
	cases := map[string]string{
		"=1+1":         "'=1+1",
		"+cmd":         "'+cmd",
		"- item":       "'- item",
		"@SUM(A1)":     "'@SUM(A1)",
		"\t=1":         "'\t=1",
		"-15":          "-15",
		"+3.5":         "+3.5",
		"plain = text": "plain = text",
		"":             "",
	}

	for input, want := range cases {
		if got := Cell(input); got != want {
			t.Errorf("Cell(%q) = %q, want %q", input, got, want)
		}
	}

	buffer := bytes.Buffer{}
	writer := NewWriter(&buffer)
	if err := writer.Write([]string{"=x", "ok"}); err != nil {
		t.Fatal(err)
	}
	writer.Flush()
	if got := buffer.String(); got != "'=x,ok\n" {
		t.Errorf("written row = %q", got)
	}
}
