package i18n

import (
	"reflect"
	"strings"
	"testing"

	"github.com/amir-zouerami/campfire/server/domain"
)

func TestStandupCopyHasEveryFieldForEveryLanguage(t *testing.T) {
	t.Parallel()

	languages := []domain.Language{
		domain.LanguageEnglish,
		domain.LanguagePersian,
		domain.LanguageArabic,
	}

	for _, language := range languages {
		language := language
		t.Run(string(language), func(t *testing.T) {
			t.Parallel()

			copy := StandupCopy(language)
			value := reflect.ValueOf(copy)
			typeOfCopy := value.Type()

			for index := 0; index < value.NumField(); index++ {
				field := value.Field(index)
				if field.Kind() != reflect.String {
					continue
				}

				if strings.TrimSpace(field.String()) == "" {
					t.Fatalf("StandupCopy(%q).%s is empty", language, typeOfCopy.Field(index).Name)
				}
			}
		})
	}
}

func TestBidiIsolateOnlyWrapsRTLValues(t *testing.T) {
	t.Parallel()

	plain := "Campfire 123"
	if got := BidiIsolate(domain.LanguageEnglish, plain); got != plain {
		t.Fatalf("english isolate = %q, want %q", got, plain)
	}

	got := BidiIsolate(domain.LanguagePersian, plain)
	if !strings.HasPrefix(got, firstStrongIsolate) || !strings.HasSuffix(got, popDirectionalIso) {
		t.Fatalf("persian isolate = %q, want FSI/PDI wrapped value", got)
	}
}
