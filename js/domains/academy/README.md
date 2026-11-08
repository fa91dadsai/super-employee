# Academy Domain (js/domains/academy)

## Overview
Staff training, menu knowledge, quiz testing, and XP gamification system. Tracks staff dish and cocktail mastery, administers multi-question interactive tests, and synchronizes learning performance bonuses into the tip distribution system.

## Interface
- `FOH.academyQuiz.openQuizModal`: Launches the modal interactive quiz dialog for dishes or cocktails `[academy-quiz.js:openQuizModal]`
- `FOH.academyQuiz.buildQuizPool`: Compiles flashcard/quiz question sets for items `[academy-quiz.js:buildQuizPool]`
- `FOH.academyView.render`: Renders the main Academy dashboard view with category filters and progress `[academy-view.js:render]`

## Invariants
- Perfect score (100%) is required to register an item as mastered (`masteredIds`) `[academy-quiz.js:openQuizModal]`
- Earned XP bonuses directly recalculate tip pool eligibility points upon quiz completion `[academy-quiz.js:renderQuizResultScreen]`

## Side Effects
- Mutates `foh-opening.academyProgress` in localStorage `[academy-quiz.js:renderQuizResultScreen]`
- Triggers modal dialog rendering (`HTMLDialogElement.showModal`) `[academy-quiz.js:openQuizModal]`

## Verification
- Run: `node --test tests/*.test.mjs`

