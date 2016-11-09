---
---
/* custom js to support the please hold web app
   james goldie, august 2016

   localStorage variables:
    - qdat: quiz data file
    - answers: object storing answers to current interaction
*/

var ph = (function()
{
    var pub = {};

    /* start_quiz: initialise data sets and find where we're up to */
    pub.start_quiz = function()
    {
        // TODO - check for< delete existing page content (for restart)
        
        if (typeof(Storage) === 'undefined')
        {
            // uh oh! nothing happening here
            throw 'Your browser doesn\x27t support local storage. That\x27s gonna be a problem.';
        }
        
        // get first question id (qid)
        if (localStorage.answers === undefined )
        {
            // start with the first question
            ph.answers = [{ qid: "phq-who"}];
            console.log('Creating new answer object');
            console.log(JSON.stringify(ph.answers));
        }
        else
        {
            // start with current question
            // (last q in array; has qid but not aid)
            ph.answers = JSON.parse(localStorage.answers);
            console.log('Reading existing answers');
            console.log(JSON.stringify(ph.answers));
        }

        // get the quiz data
        console.log('Looking for quiz data.');
        $.getJSON("{{ '/assets/quiz-pleasehold.json' | prepend: site.baseurl }}")
            .done(function(data)
            {
                // replace local quiz data if it's absent or older than
                // network copy
                if (localStorage.qdat === undefined)
                {
                    // no local version, keep this one
                    localStorage.qdat = JSON.stringify(data);
                }
                else
                {
                    // check local version number
                    if (Number(JSON.parse(localStorage.qdat).version) <
                        data.version)
                    {
                        // replace with newer network copy
                        localStorage.qdat = JSON.stringify(data);
                    }
                }

                // newest version exists, carry on
                ph.qdat = data;
                // TODO - delete #ph-loading
                ph.create_question(ph.answers[ph.answers.length - 1].qid);
            })
            .fail(function() {

                // check for present version
                if (localStorage.qdat === undefined)
                {
                    // No local version, no network access: uh oh!
                    throw 'Need network access to download quiz data.';
                }
                else
                {
                    // local version exists, carry on
                    ph.qdat = JSON.parse(localStorage.qdat)
                }
                // TODO - delete #ph-loading 
                ph.create_question(ph.answers[ph.answers.length - 1].qid);
            });
    };

    /* create_question: given a question id, generate the question and
       answer html and associated onClick events  */
    pub.create_question = function(qid)
    {
        console.log('Creating question: ' + qid);

        // question text
        $('#ph-quiz').append(
            '<h2 id="q_text">' +
            ph.qdat.questions[qid].q_text +
            '</h2>');

        // TODO - is this phq-wraup? that works differently!
        if (qid === 'phq-wrapup')
        {
            // create a textbox with the hint, and create a post button
            text_block =
                '<textarea name="phq-wrapup-text" id="phq-wrapup-text" ' +
                'cols="40" rows="5"></textarea>';
            post_btn =
                '<div class="btn-' + ph.qdat.questions[qid].btn-colour + '" ' +
                    'id="phq-wrapup-post">\n' +
                '\t<span class="fa ' + ph.qdat.questions[qid].btn-icon +
                     '"></span>\n' +
                '\t<p>Done</p>\n' +
                '</div>'
            $('#ph-quiz').append(text_block);
            $('#ph-quiz').append(post_btn);

            // attach post_btn click event
            $('#phq-wrapup-post').on('click touch',
                { notes: ph.htmlEncode($(phq-wrapup-text).val()) },
                ph.finish_quiz);
        }
        else
        {
            // otherwise, for each answer...
            $.each(ph.qdat.questions[qid].answers, function(index, value)
            {
                // build the html
                switch(value.a_type)
                {
                    case 'button':
                        ans_block =
                            '<div class="btn-' + value.a_colour +
                                '" id="' + value.a_id + '">\n' +
                            '\t<span class="fa fa-2x ' + value.a_icon + '"></span>\n' +
                            '\t<p>' + value.a_text + '</p>\n' +
                            '</div>';
                        
                        // add to the div and attach click events
                        // (qid, value)
                        
                        console.log('Answer ' + value.a_id);
                        break;
                    case 'numpick':
                        num_box =
                            '<input type="number" name="ans_numpick" id="ans_numpick" min="1" max="1440">\n';
                        ans_block = 
                            '<div class="btn-' + value.a_colour +
                                '" id="' + value.a_id + '">\n' +
                            '\t<span class="fa ' + value.a_icon + '"></span>\n' +
                            '\t<p>' + value.a_text + '</p>\n' +
                            '</div>';
                            $('#ph-quiz').append(num_box);
                        break;
                    case 'dtpick':
                        // create a date/time picker and a button
                        // TODO - more input checking on the date/time!
                        dt_box =
                            '<input type="datetime-local" name="ans_dtpick" id="ans_numpick" min="2016-01-01">';
                        ans_block = 
                            '<div class="btn-' + value.a_colour +
                                '" id="' + value.a_id + '">\n' +
                            '\t<span class="fa ' + value.a_icon +
                                '"></span>\n' +
                            '\t<p>' + value.a_text + '</p>\n' +
                            '</div>';
                            $('#ph-quiz').append(dt_box);
                    default:
                        throw 'Button type unspecified for ' + value_a_id;
                }
                $('#ph-quiz').append(ans_block);
                $('#' + value.a_id).on('click touch',
                    { qid: qid, answer: value },
                    ph.on_answer_click);
            });
        }
    }

    /* on_answer_click:
        - record aid and the goto qid (in case we have to quit in a hurry)
        - trigger a fadeout of the html block
        - register callback for the animation end for the switchover */
    pub.on_answer_click = function(event)
    {
        // record answer—this depends on the answer type!
        // event.data.answer
        switch(event.data.answer.a_type)
        {
            case 'button':
                ph.answers[ph.answers.length - 1].ans = event.data.answer.a_id;
                break;
            case 'justnowbtn':
                ph.answers[ph.answers.length - 1].ans = $.now();
                break;
            case 'numpick':
                ph.answers[ph.answers.length - 1].ans =
                    $now() - (1000 * 60 * $('#ans_numpick').val());
                break;
            case 'dtpick':
                ph.answers[ph.answers.length - 1].ans =
                    new Date($('#ans_dtpick').val().replace('T', ' '))
                    .getTime();
        }
        
        // record answer, sync w/ localStorage
        ph.answers.push({ qid: event.data.answer.goto_qid });
        localStorage.answers = JSON.stringify(ph.answers);

        // wipe last question
        $('#ph-quiz').empty();

        // load the next one
        ph.create_question(event.data.answer.goto_qid);
    }

    /* finish_quiz: record the last answer, add these answers to the history
       stack, and set the quiz back up */
    pub.finish_quiz = function(event)
    {
        // record notes as Answer
        ph.answers[ph.answers.length - 1].ans = event.data.notes;
        
        // sync w/ localStorage
        if (localStorage.history === undefined)
        {
            history = [];
        }
        else
        {
            history = JSON.parse(localStorage.history);
        }
        history.push(ph.answers);
        localStorage.history = JSON.stringify(history);
        
        // delete answers now they're in history
        localStorage.removeItem('answers');
        ph.answers = undefined;

        // TODO - update the history section?

        // remove last question and reset
        $('#ph-quiz').empty();
        ph.start_quiz();
    }

    /* htmlEncode and htmlDecode: for sanitising user notes
       (from http://stackoverflow.com/questions/12409314/how-to-escape-special-characters-from-textarea-using-jquery) */
    pub.htmlEncode = function(value){
        if (value) {
            return jQuery('<div />').text(value).html();
        } else {
            return '';
        }
    }
    pub.htmlDecode = function(value) {
        if (value) {
            return $('<div />').html(value).text();
        } else {
            return '';
        }
    }

    return pub;
})();

/* ready: do prereq checks and load quiz data */
$(document).ready(function()
{    
    try
    {
        ph.start_quiz();    
    }
    catch(err)
    {
        $('#ph-loading').text(err.message);
        console.log(err);
    }
});
