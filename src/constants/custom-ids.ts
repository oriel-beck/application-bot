
export const ApplyCustomIDs = Object.freeze({
    buttons: {
        cancel: 'application-cancel',
        done: 'application-done',
        answer: 'application-answer',
    },
    modals: {
        answer: 'application-answer'
    },
    selects: {
        edit: 'application-question-select'
    }
});

export const ApplicationCustomIDs = Object.freeze({
    buttons: {
        denied: 'decide-denied',
        accepted: 'decide-accepted',
        decide: 'decide',
        paginate: 'paginate',
        page: 'page_num'
    },
    selects: {
        list: 'application-list'
    },
    modals: {
        decide: 'decide'
    }
});

export const QuestionCustomIDs = Object.freeze({
    buttons: {
        edit: 'question-edit',
        delete: 'question-delete',
        // TODO
        page: ''
    },
    modals: {
        edit: 'question-edit'
    }
});

export const ReportCustomIDs = Object.freeze({
    buttons: {
        resolve: 'report-resolve',
        delete: 'report-delete'
    },
    modals: {
        report: 'report-modal'
    }
})
