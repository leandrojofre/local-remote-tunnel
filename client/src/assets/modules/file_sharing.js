import {
    FILE_MANAGER,
    HTML_TEMPLATES,
} from '../../main.js';

import * as moduleNoteSharing from './note_sharing.js';

export {
    init,
    checkHistoryVisibility as historyCheck
};

function checkHistoryVisibility() {
    const $shareFileHistory = $('#share-file-history');

    if (!$shareFileHistory.length) return;

    const hide = $shareFileHistory.find('.share-file-history-item').length < 1;

    $shareFileHistory.toggleClass('d-none', hide);
}

/**
 * @this {{
 *  $input: JQuery<HTMLInputElement>,
 *  $freshInput: JQuery<HTMLInputElement>
 *  $form: JQuery<HTMLFormElement>
 * }}
 */
function _resetFileInput() {
    const $newInput = this.$freshInput.clone();
    this.$input.replaceWith($newInput);
    this.$input = $newInput;
    this.$form.trigger('reset');

}

/**
 * @param {FileManagerSpace.FileData} file
 * @param {Object} [options]
 * @param {'append'|'prepend'} [options.direction]
 * @returns {Promise<void>}
 */
async function addFileHistory(file, {direction = 'append'} = {}) {
    const $item = await HTML_TEMPLATES.get('shareFileItem', {clone: true});
    const $shareFileHistory = $('#share-file-history');

    if (!$shareFileHistory.length || !file.filename) return;
    if ($shareFileHistory.find(`[file="${file.filename}"]`).length) return;

    $item.attr({file: file.filename});

    $item.find('.filename').text(file.filename);
    $item.find('.file-download')
        .prop('download', file.filename)
        .prop('href', file.url);

    $shareFileHistory[direction]($item);

    checkHistoryVisibility();
}

async function init() {
    await FILE_MANAGER.sync();

    /** @type {JQuery<HTMLFormElement>} */
    const $shareFile = await HTML_TEMPLATES.get('shareFile');

    /** @type {JQuery<HTMLInputElement>} */
    let $input = $shareFile.find('#share-file-selector');
    const $freshInput = $input.clone();

    const resetFileInput = _resetFileInput.bind({
        $input,
        $freshInput,
        $form: $shareFile
    });

    $app.append($shareFile);

    for (const fileData of FILE_MANAGER.files) {
        const {filename} = fileData;
        addFileHistory({...fileData, url: route('fileFetch', {filename})});
    }

    $shareFile.on('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(this);
        const file = formData.get('file');

        if (!file || !file['name']) return console.log('No file shared');

        $.ajax({
            url: route('fileUpload'),
            data: formData,
            method: 'POST',
            contentType: false,
            processData: false,
            async success(response) {
                if (response.error)
                    return toastr.error(response.message, 'File Upload Error');

                toastr.success(response.message, 'File Upload');
                console.log(response);

                const {filename} = response;

                await addFileHistory({
                    filename,
                    url: route('fileFetch', {filename})
                }, {direction: 'prepend'});

                resetFileInput();
            },
            error(err) {
                console.log(err);
            }
        })
    });

    $shareFile.on('click', '#share-file-selector-clear', function (e) {
        resetFileInput();
    });

    $shareFile.on('input', '#share-file-selector', function (e) {
        const formData = new FormData($shareFile.filter('form')[0]);
        const file = formData.get('file');

        if (!file || !file['name']) return console.log('No file uploaded');

        console.log(file);
        $('#share-file-filename').val(file['name']);
    });

    $shareFile.on('click', '#share-file-history .file-delete', function (e) {
        const filename = $(e.currentTarget)
            .closest('.share-file-history-item')
            .find('.filename')
            .text();

        Swal.fire({
            title: 'File Deletion',
            text: `You are deleting the file ${filename}`,
            icon: 'warning',
            showCancelButton: true,
        }).then(async function (result) {
            if (!result.isConfirmed)
                return toastr.warning('File deletion cancelled');

            const success = await FILE_MANAGER.delete(filename);

            if (!success) return;

            $app.find(`[file="${filename}"]`).remove();
            checkHistoryVisibility();
            moduleNoteSharing.historyCheck();
        });
    });
}