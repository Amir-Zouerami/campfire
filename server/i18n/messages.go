package i18n

import "github.com/amir-zouerami/campfire/server/domain"

/*
MessageKey identifies generated backend copy that must stay localized.

The catalog is intentionally small in this foundation patch. Later patches will
move report, reminder, and leave notification text onto these keys instead of
adding more ad-hoc switch statements near business logic.
*/
type MessageKey string

const (
	/*
		MessageYes is a localized affirmative value used by generated summaries.
	*/
	MessageYes MessageKey = "common.yes"

	/*
		MessageNo is a localized negative value used by generated summaries.
	*/
	MessageNo MessageKey = "common.no"
)

/*
Translate returns backend-generated localized copy for one message key.
*/
func Translate(language domain.Language, key MessageKey) string {
	catalog := catalogForLanguage(language)
	value, ok := catalog[key]
	if ok {
		return value
	}

	return englishCatalog[key]
}

func catalogForLanguage(language domain.Language) map[MessageKey]string {
	switch NormalizeLanguage(string(language), domain.LanguageEnglish) {
	case domain.LanguagePersian:
		return persianCatalog
	case domain.LanguageArabic:
		return arabicCatalog
	default:
		return englishCatalog
	}
}

var englishCatalog = map[MessageKey]string{
	MessageYes: "Yes",
	MessageNo:  "No",
}

var persianCatalog = map[MessageKey]string{
	MessageYes: "بله",
	MessageNo:  "خیر",
}

var arabicCatalog = map[MessageKey]string{
	MessageYes: "نعم",
	MessageNo:  "لا",
}
