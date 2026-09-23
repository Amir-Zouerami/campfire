package i18n

import (
	"testing"

	"github.com/amir-zouerami/campfire/server/domain"
)

func TestAlternateCalendarLabelPersian(t *testing.T) {
	cases := map[string]string{
		"2026-09-06": "۱۵ شهریور ۱۴۰۵",
		"2025-03-21": "۱ فروردین ۱۴۰۴",
		"2024-01-01": "۱۱ دی ۱۴۰۲",
		"2026-03-20": "۲۹ اسفند ۱۴۰۴",
		"2026-03-21": "۱ فروردین ۱۴۰۵",
	}

	for iso, want := range cases {
		if got := AlternateCalendarLabel(domain.ReportLanguagePersian, iso); got != want {
			t.Fatalf("AlternateCalendarLabel(persian, %q) = %q, want %q", iso, got, want)
		}
	}
}

func TestAlternateCalendarLabelNonPersianIsEmpty(t *testing.T) {
	for _, language := range []domain.ReportLanguage{domain.ReportLanguageEnglish, domain.ReportLanguageArabic} {
		if got := AlternateCalendarLabel(language, "2026-09-06"); got != "" {
			t.Fatalf("AlternateCalendarLabel(%q, ...) = %q, want empty", language, got)
		}
	}
}

func TestAlternateCalendarLabelInvalidDateIsEmpty(t *testing.T) {
	for _, value := range []string{"", "not-a-date", "2026-13-01", "2026-02-30", "2025-02-29", "2026-02-30x"} {
		if got := AlternateCalendarLabel(domain.ReportLanguagePersian, value); got != "" {
			t.Fatalf("AlternateCalendarLabel(persian, %q) = %q, want empty", value, got)
		}
	}
}

func TestParseISODatePartsAcceptsLeapDay(t *testing.T) {
	year, month, day, ok := ParseISODateParts("2024-02-29")
	if !ok || year != 2024 || month != 2 || day != 29 {
		t.Fatalf("ParseISODateParts(leap day) = (%d, %d, %d, %t), want (2024, 2, 29, true)", year, month, day, ok)
	}
}

func TestLocalizedCalendarDateArabicUsesArabicMonthAndDigits(t *testing.T) {
	got := LocalizedCalendarDate(domain.ReportLanguageArabic, "2026-09-06")
	want := "٦ سبتمبر ٢٠٢٦"

	if got != want {
		t.Fatalf("LocalizedCalendarDate(arabic, ...) = %q, want %q", got, want)
	}
}

func TestLocalizedCalendarDateEnglishIsUnchanged(t *testing.T) {
	if got := LocalizedCalendarDate(domain.ReportLanguageEnglish, "2026-09-06"); got != "2026-09-06" {
		t.Fatalf("LocalizedCalendarDate(english, ...) = %q, want unchanged", got)
	}
}
