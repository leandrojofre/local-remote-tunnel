import {
    HTML_TEMPLATES,
    FILE_MANAGER,
    CLIPBOARD,
} from '../../main.js';

export {
    init,
    checkHistoryVisibility as historyCheck,
};

function checkHistoryVisibility() {
    const $shareTextHistory = $('#share-text-history');

    if (!$shareTextHistory.length) return;

    const hide = $shareTextHistory.find('.share-text-history-item').length < 1;

    $shareTextHistory.toggleClass('d-none', hide);
}

/**
 * @param {Object} file
 * @param {string} [file.text]
 * @param {string} [file.filename]
 * @param {Object} [options]
 * @param {'append'|'prepend'} [options.direction]
 * @returns {Promise<void>}
 */
async function addTextHistory(file, {direction = 'append'} = {}) {
    const $item = await HTML_TEMPLATES.get('shareTextItem', {clone: true});
    const $shareTextHistory = $('#share-text-history');

    if (!$shareTextHistory.length || !file.text) return;

    $item.attr({file: file.filename});
    $item.data({note: file.text});

    $item.find('.text').text(file.text);
    $item.find('.note-edit').val(file.text);

    $shareTextHistory[direction]($item);

    checkHistoryVisibility();
}

async function init() {
    await FILE_MANAGER.sync({type: 'txt'});

    /** @type {JQuery<HTMLDivElement>} */
    const $shareText = await HTML_TEMPLATES.get('shareText');

    $app.append($shareText);

    for (const fileData of FILE_MANAGER.files) {
        const file = await FILE_MANAGER.fetch(fileData.filename);
        const text = await file.text();
        await addTextHistory({text, filename: fileData.filename});
    }

    $shareText.on('submit', '#share-text', function (e) {
        e.preventDefault();

        const formData = new FormData(this);
        const text = formData.get('text');

        if (!text) return console.log('No text shared');

        const file = FILE_MANAGER.create(text, {
            fromText: true,
            filename: 'note.txt'
        });

        formData.set('file', file);

        $.ajax({
            url: route('fileUpload'),
            data: formData,
            method: 'POST',
            contentType: false,
            processData: false,
            async success(response) {
                if (response.error)
                    return toastr.error(response.message, 'File Upload Error');

                toastr.success(response.message, 'Text Sharing');
                console.log(response);

                if (typeof text === 'string')
                    await addTextHistory({text, filename: response.filename}, {direction: 'prepend'});
            },
            error(e) {
                console.log(e);
            }
        })
    });

    $shareText.on('click', '.share-text-history-item .copy', function(e) {
        const $button = $(e.currentTarget);
        const $text = $button.closest('.share-text-history-item').find('.text');
        const text = $text.text() || '';
        CLIPBOARD.set(text, {selectionFallback: $text});
    });

    $shareText.on('click', '.share-text-history-item .edit', function(e) {
        const $button = $(e.currentTarget);
        const $item = $button.closest('.share-text-history-item');
        const $textarea = $item.find('.note-edit');
        const $note = $item.find('.text');
        const editClosed = $textarea.hasClass('d-none');

        console.log({$button, $item, $textarea, $note, editClosed});

        $note.toggleClass('d-none', editClosed);
        $textarea.toggleClass('d-none', !editClosed);
        $item.find('.note-edit-confirm').toggleClass('d-none', !editClosed);

        if (!editClosed) {
            const value = $note.text() || '';
            $textarea.val(value);
        }
    });

    $shareText.on('click', '.share-text-history-item .note-edit-confirm', function(e) {
        const $button = $(e.currentTarget);
        const $item = $button.closest('.share-text-history-item');
        const $note = $item.find('.text');

        const formData = new FormData();
        const text = $item.find('.note-edit').val();

        if (text === $note.text()) return;

        console.log({text});

        // TODO Make endpoint for file edit
    });
}