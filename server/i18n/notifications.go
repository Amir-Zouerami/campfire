package i18n

import (
	"fmt"
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
)

const (
	firstStrongIsolate = "\u2068"
	popDirectionalIso  = "\u2069"
)

/*
StandupNotificationCopy contains generated copy for standup scheduler messages.

The Mattermost adapter is still responsible for resolving users/channels because
that is infrastructure work. The wording itself lives here so generated messages
can be localized consistently without scattering copy across adapters.
*/
type StandupNotificationCopy struct {
	OpeningTitle        string
	OpeningSummary      string
	OpeningInstruction  string
	DateLabel           string
	DMTitle             string
	DMSummary           string
	DMInstruction       string
	DMOnlyMissingNotice string
	ChannelTitle        string
	ChannelSummary      string
	NoMissingUsers      string
	MissingCount        string
	TruncatedNotice     string
	ReminderNumber      string
	WorkspaceFallback   string
}

/*
StandupCopy returns generated scheduler notification copy for one language.
*/
func StandupCopy(language domain.Language) StandupNotificationCopy {
	switch NormalizeLanguage(string(language), domain.LanguageEnglish) {
	case domain.LanguagePersian:
		return StandupNotificationCopy{
			OpeningTitle:        "🔥 استندآپ باز شد",
			OpeningSummary:      "@all استندآپ **%s** برای %s باز شد.",
			OpeningInstruction:  "لطفاً پاسخ خود را قبل از بسته شدن استندآپ ثبت کنید.",
			DateLabel:           "تاریخ",
			DMTitle:             "🔥 یادآوری استندآپ",
			DMSummary:           "سلام %s، استندآپ Campfire شما برای **%s** هنوز ثبت نشده است.",
			DMInstruction:       "لطفاً %s را باز کنید و قبل از بسته شدن استندآپ پاسخ خود را ثبت کنید.",
			DMOnlyMissingNotice: "_این پیام فقط برای افرادی ارسال می‌شود که هنوز پاسخ نداده‌اند._",
			ChannelTitle:        "🔥 یادآوری استندآپ",
			ChannelSummary:      "استندآپ‌های زیر برای **%s** هنوز ثبت نشده‌اند. لطفاً قبل از بسته شدن استندآپ پاسخ دهید:",
			NoMissingUsers:      "- هیچ کاربری جا نمانده است.",
			MissingCount:        "- %d کاربر هنوز پاسخ نداده‌اند.",
			TruncatedNotice:     "_برای خواناتر ماندن پیام، فقط %d نفر آخر از %d کاربر جا مانده نمایش داده شده‌اند._",
			ReminderNumber:      "_یادآوری شماره %d_",
			WorkspaceFallback:   "کانال فضای کاری",
		}

	case domain.LanguageArabic:
		return StandupNotificationCopy{
			OpeningTitle:        "🔥 تم فتح الاستند أب",
			OpeningSummary:      "@all تم فتح استند أب **%s** في %s.",
			OpeningInstruction:  "يرجى إرسال إجابتك قبل إغلاق الاستند أب.",
			DateLabel:           "التاريخ",
			DMTitle:             "🔥 تذكير الاستند أب",
			DMSummary:           "مرحباً %s، لم يتم إرسال استند أب Campfire الخاص بك ليوم **%s** بعد.",
			DMInstruction:       "يرجى فتح %s وإرساله قبل إغلاق الاستند أب.",
			DMOnlyMissingNotice: "_يصل هذا التنبيه فقط إلى الأشخاص الذين لم يرسلوا إجاباتهم بعد._",
			ChannelTitle:        "🔥 تذكير الاستند أب",
			ChannelSummary:      "لا تزال هذه الاستند أب غير مكتملة ليوم **%s**. يرجى الإرسال قبل الإغلاق:",
			NoMissingUsers:      "- لا يوجد مستخدمون متأخرون.",
			MissingCount:        "- %d مستخدمون لم يرسلوا بعد.",
			TruncatedNotice:     "_للحفاظ على قابلية قراءة التنبيه، يتم عرض آخر %d من أصل %d مستخدمين متأخرين._",
			ReminderNumber:      "_التذكير رقم %d_",
			WorkspaceFallback:   "قناة مساحة العمل",
		}

	default:
		return StandupNotificationCopy{
			OpeningTitle:        "🔥 Standup is open",
			OpeningSummary:      "@all The **%s** standup is now open in %s.",
			OpeningInstruction:  "Please submit your update before the standup closes.",
			DateLabel:           "Date",
			DMTitle:             "🔥 Standup reminder",
			DMSummary:           "Hey %s, your Campfire standup for **%s** is still missing.",
			DMInstruction:       "Please open %s and submit it before the standup closes.",
			DMOnlyMissingNotice: "_This DM only goes to people who have not submitted yet._",
			ChannelTitle:        "🔥 Standup reminder",
			ChannelSummary:      "These standups are still missing for **%s**. Please submit before the standup closes:",
			NoMissingUsers:      "- No missing users.",
			MissingCount:        "- %d missing users.",
			TruncatedNotice:     "_Showing the last %d of %d missing users to keep this channel reminder readable._",
			ReminderNumber:      "_Reminder #%d_",
			WorkspaceFallback:   "the workspace channel",
		}
	}
}

/*
BidiIsolate wraps dynamic plain-text values when generated RTL copy may contain
mixed English, identifiers, numbers, or dates.

Do not use this around Mattermost mention tokens or channel references because
those tokens must remain parseable by Mattermost.
*/
func BidiIsolate(language domain.Language, value string) string {
	cleanValue := strings.TrimSpace(value)
	if cleanValue == "" {
		return ""
	}

	if DirectionForLanguage(language) != domain.TextDirectionRTL {
		return cleanValue
	}

	return fmt.Sprintf("%s%s%s", firstStrongIsolate, cleanValue, popDirectionalIso)
}
