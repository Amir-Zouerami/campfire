package i18n

import (
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
)

/*
NormalizeLanguage returns one of Campfire's supported generated-message languages.

The caller provides the fallback so creation flows can infer from timezone while
update flows can preserve the existing workspace value when the request omits a
language.
*/
func NormalizeLanguage(value string, fallback domain.Language) domain.Language {
	switch domain.Language(strings.ToLower(strings.TrimSpace(value))) {
	case domain.LanguagePersian:
		return domain.LanguagePersian
	case domain.LanguageArabic:
		return domain.LanguageArabic
	case domain.LanguageEnglish:
		return domain.LanguageEnglish
	default:
		return fallback
	}
}

/*
InferLanguageFromTimezone returns the default generated-message language for a
workspace timezone.

This is intentionally conservative: Persian is selected only for Iran's IANA
timezone, Arabic is selected for timezones commonly used by Arabic-speaking
countries, and every other workspace defaults to English. Workspace settings can
still override this default.
*/
func InferLanguageFromTimezone(timezone string) domain.Language {
	cleanTimezone := strings.TrimSpace(timezone)
	if cleanTimezone == "Asia/Tehran" {
		return domain.LanguagePersian
	}

	if arabicLanguageTimezones[cleanTimezone] {
		return domain.LanguageArabic
	}

	return domain.LanguageEnglish
}

/*
DirectionForLanguage returns the base UI/message direction for a language.
*/
func DirectionForLanguage(language domain.Language) domain.TextDirection {
	switch NormalizeLanguage(string(language), domain.LanguageEnglish) {
	case domain.LanguagePersian, domain.LanguageArabic:
		return domain.TextDirectionRTL
	default:
		return domain.TextDirectionLTR
	}
}

var arabicLanguageTimezones = map[string]bool{
	"Africa/Algiers":    true,
	"Africa/Cairo":      true,
	"Africa/Casablanca": true,
	"Africa/Khartoum":   true,
	"Africa/Tripoli":    true,
	"Africa/Tunis":      true,
	"Asia/Amman":        true,
	"Asia/Baghdad":      true,
	"Asia/Bahrain":      true,
	"Asia/Beirut":       true,
	"Asia/Dubai":        true,
	"Asia/Jeddah":       true,
	"Asia/Kuwait":       true,
	"Asia/Muscat":       true,
	"Asia/Qatar":        true,
	"Asia/Riyadh":       true,
}
