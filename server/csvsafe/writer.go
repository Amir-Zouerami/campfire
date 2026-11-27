/*
Package csvsafe writes CSV files that spreadsheets cannot execute.
*/
package csvsafe

import (
	"encoding/csv"
	"io"
	"strconv"
	"strings"
)

/*
Cell prefixes values a spreadsheet would evaluate as a formula with an
apostrophe. Signed numbers are left alone.
*/
func Cell(value string) string {
	if value == "" || !strings.ContainsRune("=+-@\t\r", rune(value[0])) {
		return value
	}

	if _, err := strconv.ParseFloat(value, 64); err == nil {
		return value
	}

	return "'" + value
}

/*
Writer is a csv.Writer that passes every cell through Cell.
*/
type Writer struct {
	*csv.Writer
}

/*
NewWriter creates a formula-safe CSV writer.
*/
func NewWriter(destination io.Writer) *Writer {
	return &Writer{Writer: csv.NewWriter(destination)}
}

/*
Write writes one record.
*/
func (w *Writer) Write(record []string) error {
	safe := make([]string, len(record))
	for index, value := range record {
		safe[index] = Cell(value)
	}

	return w.Writer.Write(safe)
}
