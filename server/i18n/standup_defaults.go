package i18n

import "github.com/amir-zouerami/campfire/server/domain"

/*
StandupQuestionCopy contains localized seed copy for one default standup question.

These values are only used when Campfire creates plain database rows for a new
workspace. After seeding, admins can edit or delete the rows exactly like any
manually-created standup question.
*/
type StandupQuestionCopy struct {
	Section     string
	Label       string
	HelpText    string
	Placeholder string
}

/*
DefaultDailyStandupQuestions returns localized default daily standup questions.
*/
func DefaultDailyStandupQuestions(language domain.Language) []StandupQuestionCopy {
	switch NormalizeLanguage(string(language), domain.LanguageEnglish) {
	case domain.LanguagePersian:
		return []StandupQuestionCopy{
			{
				Section:     "کارهای دیروز",
				Label:       "دیروز روی چه چیزهایی کار کردید؟",
				HelpText:    "کارهایی را بنویسید که دیروز انجام دادید یا جلو بردید.",
				Placeholder: "مثلاً اصلاح ورود، بررسی Pull Requestها، هماهنگی با تیم محصول…",
			},
			{
				Section:     "برنامه امروز",
				Label:       "امروز روی چه چیزهایی کار می‌کنید؟",
				HelpText:    "تمرکز اصلی و کارهای برنامه‌ریزی‌شده‌ی امروز را بنویسید.",
				Placeholder: "مثلاً تکمیل گزارش‌ها، رفع باگ زمان‌بندی، جلسه با تیم طراحی…",
			},
			{
				Section:     "موانع",
				Label:       "آیا مانع یا ریسکی دارید؟",
				HelpText:    "وابستگی‌ها، ریسک‌ها یا مواردی را بنویسید که نیاز به پیگیری دارند.",
				Placeholder: "مثلاً منتظر تأیید API هستم…",
			},
			{
				Section:     "ثبت زمان",
				Label:       "آیا زمان صرف‌شده‌ی روز قبل را برای هر تسک ثبت کرده‌اید؟",
				HelpText:    "تأیید کنید که زمان کارهای روز قبل در Campfire ثبت شده است.",
				Placeholder: "",
			},
		}

	case domain.LanguageArabic:
		return []StandupQuestionCopy{
			{
				Section:     "عمل أمس",
				Label:       "ما الذي عملت عليه أمس؟",
				HelpText:    "اكتب الأعمال التي أنجزتها أو دفعتها إلى الأمام أمس.",
				Placeholder: "مثلاً تحسين تسجيل الدخول، مراجعة طلبات الدمج، التنسيق مع فريق المنتج…",
			},
			{
				Section:     "خطة اليوم",
				Label:       "ما الذي ستعمل عليه اليوم؟",
				HelpText:    "اكتب تركيزك الأساسي والأعمال المخطط لها اليوم.",
				Placeholder: "مثلاً إكمال التقارير، إصلاح جدولة التذكيرات، اجتماع مع فريق التصميم…",
			},
			{
				Section:     "العوائق",
				Label:       "هل لديك أي عوائق أو مخاطر؟",
				HelpText:    "اذكر الاعتماديات أو المخاطر أو الأمور التي تحتاج إلى متابعة.",
				Placeholder: "مثلاً أنتظر اعتماد واجهة API…",
			},
			{
				Section:     "تسجيل الوقت",
				Label:       "هل سجّلت وقت يوم العمل السابق لكل مهمة؟",
				HelpText:    "أكد أن وقت أعمال اليوم السابق تم تسجيله في Campfire.",
				Placeholder: "",
			},
		}

	default:
		return []StandupQuestionCopy{
			{
				Section:     "Yesterday",
				Label:       "What did you work on yesterday?",
				HelpText:    "Share the work you completed or moved forward yesterday.",
				Placeholder: "Finished login refactor, reviewed dashboard PRs, synced with product…",
			},
			{
				Section:     "Today",
				Label:       "What are you working on today?",
				HelpText:    "Share your main focus and planned work for today.",
				Placeholder: "Finish reporting filters, fix reminder scheduling, meet with design…",
			},
			{
				Section:     "Blockers",
				Label:       "Do you have any blockers or risks?",
				HelpText:    "Share blockers, dependencies, or risks that need help.",
				Placeholder: "Waiting on API contract approval…",
			},
			{
				Section:     "Time tracking",
				Label:       "Have you submitted yesterday's spent time for each task?",
				HelpText:    "Confirm that yesterday's task time has been recorded in Campfire.",
				Placeholder: "",
			},
		}
	}
}

/*
DefaultWeeklyStandupQuestions returns localized default weekly standup questions.
*/
func DefaultWeeklyStandupQuestions(language domain.Language) []StandupQuestionCopy {
	switch NormalizeLanguage(string(language), domain.LanguageEnglish) {
	case domain.LanguagePersian:
		return []StandupQuestionCopy{
			{
				Section:     "دستاوردها",
				Label:       "این هفته چه دستاوردهایی داشتید؟",
				HelpText:    "خروجی‌ها و پیشرفت‌های مهم هفته را خلاصه کنید.",
				Placeholder: "مثلاً تکمیل بهبودهای onboarding، کاهش خطاهای تست، انتشار نسخه جدید…",
			},
			{
				Section:     "در جریان",
				Label:       "الان چه کارهایی در جریان است و هفته آینده روی چه چیزهایی کار می‌کنید؟",
				HelpText:    "وضعیت فعلی و تمرکزهای بعدی خود را بنویسید.",
				Placeholder: "مثلاً تکمیل فیلترهای گزارش، بازبینی جریان مرخصی، برنامه‌ریزی انتشار…",
			},
			{
				Section:     "موانع",
				Label:       "این هفته چه موانع یا ریسک‌هایی داشتید؟",
				HelpText:    "مواردی را بنویسید که باعث کندی، وابستگی یا ریسک شده‌اند.",
				Placeholder: "مثلاً زمان انتشار به بازبینی امنیتی وابسته است…",
			},
			{
				Section:     "یادگیری",
				Label:       "این هفته چه چیزی یاد گرفتید؟",
				HelpText:    "نکات فنی، فرایندی یا تیمی مهم هفته را بنویسید.",
				Placeholder: "مثلاً درباره محدودیت‌های scheduler، رفتار Mattermost plugin API…",
			},
		}

	case domain.LanguageArabic:
		return []StandupQuestionCopy{
			{
				Section:     "الإنجازات",
				Label:       "ما إنجازاتك هذا الأسبوع؟",
				HelpText:    "لخّص المخرجات والتقدم المهم خلال الأسبوع.",
				Placeholder: "مثلاً تحسين onboarding، تقليل اختبارات flaky، إصدار نسخة جديدة…",
			},
			{
				Section:     "قيد العمل",
				Label:       "ما العمل الجاري الآن وما الذي ستعمل عليه الأسبوع القادم؟",
				HelpText:    "اكتب الحالة الحالية وأهم الأولويات القادمة.",
				Placeholder: "مثلاً إكمال فلاتر التقارير، مراجعة مسار الإجازات، تخطيط الإصدار…",
			},
			{
				Section:     "العوائق",
				Label:       "ما العوائق أو المخاطر التي واجهتها هذا الأسبوع؟",
				HelpText:    "اذكر ما سبب تأخيراً أو اعتماداً أو خطراً يحتاج إلى متابعة.",
				Placeholder: "مثلاً توقيت الإصدار يعتمد على مراجعة أمنية…",
			},
			{
				Section:     "التعلّم",
				Label:       "ما الذي تعلمته هذا الأسبوع؟",
				HelpText:    "شارك الدروس التقنية أو العملية أو المتعلقة بالفريق.",
				Placeholder: "مثلاً قيود scheduler، سلوك Mattermost plugin API…",
			},
		}

	default:
		return []StandupQuestionCopy{
			{
				Section:     "Accomplishments",
				Label:       "What did you accomplish this week?",
				HelpText:    "Summarize the meaningful outcomes and progress from this week.",
				Placeholder: "Shipped onboarding improvements, reduced flaky tests, released a new version…",
			},
			{
				Section:     "In progress",
				Label:       "What is in progress now, including next week's work?",
				HelpText:    "Share current status and the most important upcoming focus areas.",
				Placeholder: "Finish reporting filters, review leave workflow, plan release tasks…",
			},
			{
				Section:     "Blockers",
				Label:       "What blockers or risks came up this week?",
				HelpText:    "Share anything that caused delay, dependency, or risk.",
				Placeholder: "Release timing depends on security review…",
			},
			{
				Section:     "Learning",
				Label:       "What did you learn this week?",
				HelpText:    "Share technical, process, or team lessons from the week.",
				Placeholder: "Scheduler limitations, Mattermost plugin API behavior…",
			},
		}
	}
}
