/* ============================================================
   Letter — auto-saves to localStorage
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const to      = document.getElementById('letterTo');
    const content = document.getElementById('letterContent');
    const from    = document.getElementById('letterFrom');
    const counter = document.getElementById('letterCharCount');
    const clearBtn = document.getElementById('letterClear');

    if (!content) return;

    // Restore
    to.value      = localStorage.getItem('letter-to')      || '';
    content.value = localStorage.getItem('letter-content') || '';
    from.value    = localStorage.getItem('letter-from')    || '';
    updateCount();

    // Auto-save
    to.addEventListener('input',      () => { localStorage.setItem('letter-to',      to.value);      });
    from.addEventListener('input',    () => { localStorage.setItem('letter-from',    from.value);    });
    content.addEventListener('input', () => { localStorage.setItem('letter-content', content.value); updateCount(); });

    // Tab in textarea
    content.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const s = content.selectionStart;
            content.value = content.value.substring(0, s) + '    ' + content.value.substring(content.selectionEnd);
            content.selectionStart = content.selectionEnd = s + 4;
            localStorage.setItem('letter-content', content.value);
            updateCount();
        }
    });

    clearBtn.addEventListener('click', () => {
        to.value = ''; from.value = ''; content.value = '';
        ['letter-to', 'letter-from', 'letter-content'].forEach(k => localStorage.removeItem(k));
        updateCount();
        to.focus();
    });

    function updateCount() {
        const n = content.value.length;
        counter.textContent = `${n.toLocaleString()} char${n !== 1 ? 's' : ''}`;
    }
});
