# CLAUDE.md — FOH Opening & Super Employee App

@../AGENTS.md
@../.agents/rules/graphify.md
@../.agents/rules/lessons-learned.md
@./README.md

## التشغيل التلقائي الإجباري في `foh-opening`
في كل محادثة داخل `foh-opening`:
1. شغّل تلقائياً `node ../elephant-goldfish-model/scripts/egm_graphify_bridge.mjs context <symbol_or_file>` أو `review-pack` قبل قراءة الملفات الخام أو اقتراح تعديلات.
2. استخدم مهارات **EGM** (`egm-brainstorm`, `egm-review`, `egm-bootstrap`, `egm-drift-report`) ووكلاء **Goldfish** بشكل تلقائي دون انتظار طلب مباشر.
3. بعد أي تعديل على الكود، شغّل `node ../elephant-goldfish-model/scripts/egm_graphify_bridge.mjs drift .` وتأكد من بقاء الانحراف `0 Discrepancies`.

