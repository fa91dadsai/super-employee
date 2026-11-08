// foh-opening/js/domains/academy/academy-quiz.js
// Academy Quiz & Flashcard Engine
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
  }

  function buildQuizPool(targetItem, catalog, ar) {
    if (targetItem && Array.isArray(targetItem.questions) && targetItem.questions.length) {
      return targetItem.questions.map((q) => ({
        ...q,
        itemId: targetItem.id,
        itemName: ar ? targetItem.nameAr : targetItem.nameEn,
      }));
    }
    const pool = [];
    catalog.forEach((it) => {
      (it.questions || []).forEach((q) => {
        pool.push({
          ...q,
          itemId: it.id,
          itemName: ar ? it.nameAr : it.nameEn,
        });
      });
    });
    return pool;
  }

  function renderQuizResultScreen(opts) {
    const { box, result, onDone, ar } = opts;
    const { passedAll, earnedXP, correctCount, poolLength, targetItem, rec, bonusPts } = result;
    box.innerHTML =
      '<div style="text-align:center;padding:12px 0;">' +
      '<div style="font-size:2.6rem;">' + (passedAll ? '🏆' : '💡') + '</div>' +
      '<h2 style="margin:8px 0;">' +
      (passedAll
        ? (ar ? 'أحسنت! اجتزت الاختبار بنجاح 100%' : 'Excellent! You passed 100%!')
        : (ar ? 'نتيجة الاختبار: ' + correctCount + ' من ' + poolLength : 'Score: ' + correctCount + ' / ' + poolLength)) +
      '</h2>' +
      '<p style="color:var(--ink2);font-size:0.88rem;">' +
      (targetItem && passedAll
        ? (ar ? 'تم اعتماد إتقانك لصنف (' + (ar ? targetItem.nameAr : targetItem.nameEn) + ') وإضافة +' + earnedXP + ' XP لرصيدك!' : 'Item marked as Mastered and +' + earnedXP + ' XP added!')
        : (ar ? 'حصلت على +' + earnedXP + ' XP (إجمالي رصيدك: ' + rec.xp + ' XP · مكافأة التبس: +' + bonusPts + ' نقطة)' : 'Earned +' + earnedXP + ' XP (Total: ' + rec.xp + ' XP · Bonus Tip Pts: +' + bonusPts + ')')) +
      '</p>' +
      '</div>';

    const doneB = el('button', 'btn primary', ar ? '✓ العودة للأكاديمية وتحديث الرصيد' : '✓ Back to Academy');
    doneB.type = 'button';
    doneB.style.width = '100%';
    doneB.addEventListener('click', onDone);
    box.append(doneB);
  }

  function renderQuizQuestionScreen(opts) {
    const { box, qData, onNext, onCancel, ar } = opts;
    const { cur, idx, total, onAnswerSelect } = qData;
    box.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '<span class="dayoff-badge pending">🎯 ' + (ar ? 'سؤال ' + (idx + 1) + ' من ' + total : 'Question ' + (idx + 1) + ' of ' + total) + '</span>' +
      '<small style="color:var(--ink2);font-weight:700;">' + cur.itemName + '</small>' +
      '</div>' +
      '<h3 style="margin:6px 0 12px;font-size:1.02rem;line-height:1.45;">' + (ar ? cur.qAr : cur.qEn || cur.qAr) + '</h3>';

    const optsWrap = el('div', '');
    const feedback = el('p', '');
    feedback.style.fontWeight = '700';
    feedback.style.fontSize = '0.84rem';
    feedback.style.marginTop = '10px';
    feedback.hidden = true;

    const nextBtn = el(
      'button',
      'btn primary',
      idx + 1 < total ? (ar ? 'السؤال التالي ←' : 'Next Question →') : (ar ? 'عرض النتيجة واعتماد النقاط 🏆' : 'See Result & Claim XP 🏆')
    );
    nextBtn.type = 'button';
    nextBtn.style.width = '100%';
    nextBtn.style.marginTop = '12px';
    nextBtn.hidden = true;
    nextBtn.addEventListener('click', onNext);

    let answered = false;
    (cur.options || []).slice(0, 3).forEach((optText, optIndex) => {
      const b = el('button', 'quiz-opt-btn', (optIndex + 1) + '. ' + optText);
      b.type = 'button';
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const isRight = optIndex === cur.correct;
        onAnswerSelect(isRight);
        if (isRight) {
          b.classList.add('correct');
          feedback.style.color = 'var(--accent)';
          feedback.textContent = ar ? '✅ إجابة صحيحة! (+15 XP)' : '✅ Correct answer! (+15 XP)';
        } else {
          b.classList.add('wrong');
          const allBtns = optsWrap.querySelectorAll('.quiz-opt-btn');
          if (allBtns[cur.correct]) allBtns[cur.correct].classList.add('correct');
          feedback.style.color = 'var(--danger)';
          feedback.textContent = ar ? '❌ إجابة غير دقيقة — راجع الخيار الصحيح باللون الأخضر.' : '❌ Not quite — check the highlighted correct option.';
        }
        feedback.hidden = false;
        nextBtn.hidden = false;
      });
      optsWrap.append(b);
    });

    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Close');
    cancelB.type = 'button';
    cancelB.style.width = '100%';
    cancelB.style.marginTop = '8px';
    cancelB.addEventListener('click', onCancel);

    box.append(optsWrap, feedback, nextBtn, cancelB);
  }

  function openQuizModal(targetItem) {
    const ar = isAr();
    const catalog = loadAcademyCatalog();
    const { uname, rec, all } = getMyAcadRecord();
    const pool = buildQuizPool(targetItem, catalog, ar);
    if (!pool.length) return;

    let idx = 0;
    let correctCount = 0;

    let dlg = $('acadQuizDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'acadQuizDialog';
      document.body.append(dlg);
    }

    function drawQuestion() {
      dlg.replaceChildren();
      const box = el('div', '');
      box.style.padding = '16px 18px 22px';

      if (idx >= pool.length) {
        const passedAll = correctCount === pool.length;
        const earnedXP = correctCount * 15 + (targetItem && passedAll ? 20 : 0);
        rec.xp = (rec.xp || 0) + earnedXP;
        rec.quizAnswered = (rec.quizAnswered || 0) + pool.length;
        rec.quizCorrect = (rec.quizCorrect || 0) + correctCount;
        if (targetItem && passedAll && !rec.masteredIds.includes(targetItem.id)) {
          rec.masteredIds.push(targetItem.id);
        }
        saveAcadProgress(all);
        const bonusPts = syncAcademyBonusToTips(uname, rec.xp);

        renderQuizResultScreen({
          box,
          result: { passedAll, earnedXP, correctCount, poolLength: pool.length, targetItem, rec, bonusPts },
          onDone: () => { dlg.close(); FOH.app.render(); },
          ar,
        });
        dlg.append(box);
        return;
      }

      renderQuizQuestionScreen({
        box,
        qData: {
          cur: pool[idx],
          idx,
          total: pool.length,
          onAnswerSelect: (isRight) => { if (isRight) correctCount++; },
        },
        onNext: () => { idx++; drawQuestion(); },
        onCancel: () => dlg.close(),
        ar,
      });
      dlg.append(box);
      if (typeof injectNewTasksInboxIntoNotifCenter === "function") injectNewTasksInboxIntoNotifCenter();
    }

    drawQuestion();
    dlg.showModal();
  }

  // ============================================================================
  // Add Academy Dish / Cocktail Sub-Renderers (< 80 lines each)
  // ============================================================================


  FOH.academyQuiz = {
    openQuizModal,
    buildQuizPool
  };
})(window.FOH = window.FOH || {});
