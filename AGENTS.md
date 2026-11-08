# AGENTS.md — FOH Opening & Super Employee App

يرث هذا المجلد جميع قواعد الدستور العام في `../AGENTS.md` و`../.agents/rules/graphify.md` و`../.agents/rules/lessons-learned.md`.

## التشغيل التلقائي الإجباري لـ Graphify ومهارات EGM
1. **الاستكشاف التلقائي**: شغّل `node ../elephant-goldfish-model/scripts/egm_graphify_bridge.mjs context <symbol_or_file>` قبل فحص الكود الخام.
2. **التصميم والمراجعة التلقائية**: استخدم `review-pack` و`blast-radius` وأطلق وكلاء المراجعة المستقلين (Goldfish Subagents) تلقائياً عند أي طلب تطوير أو مراجعة.
3. **بوابة الإغلاق التلقائية**: شغّل `node ../elephant-goldfish-model/scripts/egm_graphify_bridge.mjs drift .` و`god-nodes .` بعد كل تعديل، وحدّث عقد `README.md` المحلي عند تغير أي واجهة أو شرط أو أثر جانبي.

