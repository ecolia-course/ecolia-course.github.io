import os
import glob

RENDER_QUIZ = '''
function renderQuiz() {
    const qc = document.getElementById('quizQuestions');
    if (!qc) return;
    if (typeof questions === 'undefined' || questions.length === 0) {
        qc.innerHTML = '<p style="color:#666;font-style:italic;">Quiz bientot disponible.</p>';
        return;
    }
    let html = '';
    questions.forEach((q, i) => {
        html += '<div class="quiz-question"><p>' + (i+1) + '. ' + q.text + '</p>';
        q.options.forEach((o, k) => {
            html += '<label><input type="radio" name="q' + i + '" value="' + k + '"> ' + o + '</label>';
        });
        html += '</div>';
    });
    qc.innerHTML = html;
    const submitBtn = document.getElementById('submitQuiz');
    if (submitBtn) {
        submitBtn.onclick = () => {
            let score = 0;
            questions.forEach((q, i) => {
                const s = document.querySelector('input[name="q' + i + '"]:checked');
                if (s && parseInt(s.value) === q.correct) score++;
            });
            const pct = Math.round(score/questions.length*100);
            document.getElementById('quizResult').innerHTML =
                '<div style="background:var(--bg2);padding:16px;border-radius:10px;margin-top:14px;">' +
                '<strong>Score : ' + score + '/' + questions.length + ' (' + pct + '%)</strong></div>';
        };
    }
}
'''

def patch(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    if 'function renderQuiz' in c:
        return "OK"

    if 'function renderSlide' not in c:
        return "STRUCTURE INCONNUE"

    c = c.replace('function renderSlide', RENDER_QUIZ + '\nfunction renderSlide', 1)

    old = "    contentDiv.scrollTop = 0;\n    if (keepHighlight && lastSearchTerm) highlightInCurrentSlide(lastSearchTerm);"
    new = "    if (index === slides.length - 1) renderQuiz();\n" + old
    if old in c and 'if (index === slides.length - 1) renderQuiz();' not in c:
        c = c.replace(old, new, 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    return "PATCH"

ok = 0
patched = 0
erreurs = []

for f in sorted(glob.glob("*.html")):
    r = patch(f)
    if r == "PATCH":
        patched += 1
        print(f"PATCH  {f}")
    elif r == "OK":
        ok += 1
    else:
        erreurs.append(f)

print()
print(f"Patchés : {patched}")
print(f"Déjà OK : {ok}")
if erreurs:
    print("À vérifier manuellement :")
    for e in erreurs:
        print("  -", e)