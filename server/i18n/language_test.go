package i18n

import (
	"reflect"
	"testing"

	"github.com/amir-zouerami/campfire/server/domain"
)

func TestInferLanguageFromTimezone(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		timezone string
		want     domain.Language
	}{
		{name: "iran uses persian", timezone: "Asia/Tehran", want: domain.LanguagePersian},
		{name: "arabic timezone uses arabic", timezone: "Asia/Dubai", want: domain.LanguageArabic},
		{name: "western timezone uses english", timezone: "Europe/Berlin", want: domain.LanguageEnglish},
		{name: "empty timezone uses english", timezone: "", want: domain.LanguageEnglish},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			got := InferLanguageFromTimezone(test.timezone)
			if got != test.want {
				t.Fatalf("InferLanguageFromTimezone(%q) = %q, want %q", test.timezone, got, test.want)
			}
		})
	}
}

func TestDirectionForLanguage(t *testing.T) {
	t.Parallel()

	tests := []struct {
		language domain.Language
		want     domain.TextDirection
	}{
		{language: domain.LanguageEnglish, want: domain.TextDirectionLTR},
		{language: domain.LanguagePersian, want: domain.TextDirectionRTL},
		{language: domain.LanguageArabic, want: domain.TextDirectionRTL},
	}

	for _, test := range tests {
		test := test
		t.Run(string(test.language), func(t *testing.T) {
			t.Parallel()

			got := DirectionForLanguage(test.language)
			if got != test.want {
				t.Fatalf("DirectionForLanguage(%q) = %q, want %q", test.language, got, test.want)
			}
		})
	}
}

func TestBackendCatalogParity(t *testing.T) {
	t.Parallel()

	englishKeys := sortedMessageKeys(englishCatalog)
	catalogs := map[string]map[MessageKey]string{
		"persian": persianCatalog,
		"arabic":  arabicCatalog,
	}

	for name, catalog := range catalogs {
		name := name
		catalog := catalog
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			keys := sortedMessageKeys(catalog)
			if !reflect.DeepEqual(keys, englishKeys) {
				t.Fatalf("%s catalog keys = %v, want %v", name, keys, englishKeys)
			}

			for key, value := range catalog {
				if value == "" {
					t.Fatalf("%s catalog key %q has empty translation", name, key)
				}
			}
		})
	}
}

func sortedMessageKeys(catalog map[MessageKey]string) []MessageKey {
	keys := make([]MessageKey, 0, len(catalog))
	for key := range catalog {
		keys = append(keys, key)
	}

	for index := 1; index < len(keys); index++ {
		for previous := index; previous > 0 && keys[previous] < keys[previous-1]; previous-- {
			keys[previous], keys[previous-1] = keys[previous-1], keys[previous]
		}
	}

	return keys
}
