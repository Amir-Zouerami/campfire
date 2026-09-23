package i18n

import (
	"fmt"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
)

/*
Campfire stores every calendar value as a canonical Gregorian YYYY-MM-DD string.
Persian and Arabic readers expect to see those same dates in their own calendar,
so this file owns the display-only conversion used by both generated Mattermost
messages and Markdown reports.

The Jalali algorithm is integer-only and self-contained on purpose: storage and
API contracts stay Gregorian, and only the rendered label changes.
*/

/*
ParseISODateParts parses a canonical YYYY-MM-DD date into Gregorian parts.
*/
func ParseISODateParts(value string) (int, int, int, bool) {
	cleanValue := strings.TrimSpace(value)
	if len(cleanValue) != len("2006-01-02") {
		return 0, 0, 0, false
	}

	parsed, err := time.Parse("2006-01-02", cleanValue)
	if err != nil {
		return 0, 0, 0, false
	}

	year, month, day := parsed.Date()

	return year, int(month), day, true
}

/*
LocalizedCalendarDate renders one canonical Gregorian ISO date in the reading
calendar for a language.

Persian dates are converted to the Jalali calendar; Arabic dates keep the
Gregorian months but use Arabic month names and digits. English and unparseable
values are returned unchanged (digits are still localized so mixed strings stay
consistent).
*/
func LocalizedCalendarDate(language domain.ReportLanguage, isoDate string) string {
	cleanDate := strings.TrimSpace(isoDate)

	year, month, day, ok := ParseISODateParts(cleanDate)
	if !ok {
		return LocalizeDigits(language, cleanDate)
	}

	switch language {
	case domain.ReportLanguagePersian:
		jalaliYear, jalaliMonth, jalaliDay := GregorianToJalali(year, month, day)

		return ToPersianDigits(fmt.Sprintf("%d %s %d", jalaliDay, PersianMonthName(jalaliMonth), jalaliYear))

	case domain.ReportLanguageArabic:
		return ToArabicDigits(fmt.Sprintf("%d %s %d", day, ArabicGregorianMonthName(month), year))

	default:
		return cleanDate
	}
}

/*
AlternateCalendarLabel returns the parenthetical calendar hint for a report date,
or an empty string when the active language does not need one.

Reports always print the canonical Gregorian date; this label is the localized
companion (the Jalali date for Persian workspaces) so scheduled reports match what
the browser adds to manually posted ones. Arabic reports intentionally stay on
the Gregorian date with no companion label, mirroring the webapp.
*/
func AlternateCalendarLabel(language domain.ReportLanguage, isoDate string) string {
	year, month, day, ok := ParseISODateParts(isoDate)
	if !ok {
		return ""
	}

	if language != domain.ReportLanguagePersian {
		return ""
	}

	jalaliYear, jalaliMonth, jalaliDay := GregorianToJalali(year, month, day)

	return ToPersianDigits(fmt.Sprintf("%d %s %d", jalaliDay, PersianMonthName(jalaliMonth), jalaliYear))
}

/*
GregorianToJalali converts a Gregorian date to the Persian Jalali calendar.
*/
func GregorianToJalali(gy int, gm int, gd int) (int, int, int) {
	gDaysInMonth := []int{31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31}
	jDaysInMonth := []int{31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29}

	gy -= 1600
	gm--
	gd--

	gDayNumber := 365*gy + (gy+3)/4 - (gy+99)/100 + (gy+399)/400
	for i := 0; i < gm; i++ {
		gDayNumber += gDaysInMonth[i]
	}

	if gm > 1 && ((gy+1600)%4 == 0 && ((gy+1600)%100 != 0 || (gy+1600)%400 == 0)) {
		gDayNumber++
	}

	gDayNumber += gd
	jDayNumber := gDayNumber - 79
	jNp := jDayNumber / 12053
	jDayNumber %= 12053

	jy := 979 + 33*jNp + 4*(jDayNumber/1461)
	jDayNumber %= 1461

	if jDayNumber >= 366 {
		jy += (jDayNumber - 1) / 365
		jDayNumber = (jDayNumber - 1) % 365
	}

	jm := 0
	for jm < 11 && jDayNumber >= jDaysInMonth[jm] {
		jDayNumber -= jDaysInMonth[jm]
		jm++
	}

	return jy, jm + 1, jDayNumber + 1
}

/*
PersianMonthName returns the Persian Jalali month name for a 1-based month.
*/
func PersianMonthName(month int) string {
	months := []string{
		"فروردین",
		"اردیبهشت",
		"خرداد",
		"تیر",
		"مرداد",
		"شهریور",
		"مهر",
		"آبان",
		"آذر",
		"دی",
		"بهمن",
		"اسفند",
	}

	if month < 1 || month > len(months) {
		return ""
	}

	return months[month-1]
}

/*
ArabicGregorianMonthName returns an Arabic Gregorian month name for a 1-based month.
*/
func ArabicGregorianMonthName(month int) string {
	months := []string{
		"يناير",
		"فبراير",
		"مارس",
		"أبريل",
		"مايو",
		"يونيو",
		"يوليو",
		"أغسطس",
		"سبتمبر",
		"أكتوبر",
		"نوفمبر",
		"ديسمبر",
	}

	if month < 1 || month > len(months) {
		return ""
	}

	return months[month-1]
}

/*
LocalizeDigits localizes ASCII digits without changing separators or text.
*/
func LocalizeDigits(language domain.ReportLanguage, value string) string {
	switch language {
	case domain.ReportLanguagePersian:
		return ToPersianDigits(value)
	case domain.ReportLanguageArabic:
		return ToArabicDigits(value)
	default:
		return value
	}
}

/*
ToPersianDigits converts ASCII digits to Persian digits.
*/
func ToPersianDigits(value string) string {
	return strings.NewReplacer(
		"0", "۰",
		"1", "۱",
		"2", "۲",
		"3", "۳",
		"4", "۴",
		"5", "۵",
		"6", "۶",
		"7", "۷",
		"8", "۸",
		"9", "۹",
	).Replace(value)
}

/*
ToArabicDigits converts ASCII digits to Arabic-Indic digits.
*/
func ToArabicDigits(value string) string {
	return strings.NewReplacer(
		"0", "٠",
		"1", "١",
		"2", "٢",
		"3", "٣",
		"4", "٤",
		"5", "٥",
		"6", "٦",
		"7", "٧",
		"8", "٨",
		"9", "٩",
	).Replace(value)
}
