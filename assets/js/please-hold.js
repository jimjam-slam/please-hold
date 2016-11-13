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
        // storage size checks first up
        if (JSON.stringify(localStorage).length > 2300000)
        {
            $('#ph-storage-full').fadeToggle('fast', function()
            {
                throw 'localStorage is full!';
            });
            
        }
        else if (JSON.stringify(localStorage).length > 2000000)
        {
            $('#ph-storage-warning').fadeToggle('fast');    
        }
        
        // TODO - check for< delete existing page content (for restart)
        
        if (typeof(Storage) === 'undefined')
        {
            // uh oh! nothing happening here
            $('#ph-storage-nostorage').fadeToggle('fast', function()
            {
                throw 'Your browser doesn\x27t support local storage. ' + 
                    'That\x27s gonna be a problem.';
            });
        }
        
        // get first question id (qid)
        if (localStorage.answers === undefined )
        {
            // start with the first question
            ph.answers = {};
            ph.answers.log = [{ qid: "phq-who"}];
            // console.log('Creating new answer object');
            // console.log(JSON.stringify(ph.answers));
        }
        else
        {
            // start with current question
            // (last q in array; has qid but not aid)
            ph.answers = JSON.parse(localStorage.answers);
        }

        // get the quiz data
        // console.log('Looking for quiz data.');
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
                ph.create_question(ph.answers.log[ph.answers.log.length - 1].qid);
                
                // populate history block as well
                ph.render_history();

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
                // hide the quiz for a tic...
                $('#ph-quiz').fadeToggle('fast', function()
                {
                    // to refresh the questions and (re)populate history
                    ph.create_question(
                        ph.answers.log[ph.answers.log.length - 1].qid);
                    ph.render_history();
                }); 
            });
    };

    /* create_question: given a question id, generate the question and
       answer html and associated onClick events  */
    pub.create_question = function(qid)
    {
        // console.log('Creating question: ' + qid);
        $('#ph-loading').css('display', 'none');

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
                'cols="40" rows="5" placeholder="' +
                ph.qdat.questions[qid].q_hint + '"></textarea>';
            post_btn =
                '<button class="btn-' + ph.qdat.questions[qid].btn_colour +
                    '" id="phq-wrapup-post">\n' +
                '\t<span class="fa ' + ph.qdat.questions[qid].btn_icon +
                     '"></span>\n' +
                '\t<p>Done</p>\n' +
                '</button>'
            $('#ph-quiz').append(text_block);
            $('#ph-quiz').append(post_btn);

            // attach post_btn click event
            $('#phq-wrapup-post').on('click touch', ph.finish_quiz);
        }
        else
        {
            // otherwise, for each answer...
            $.each(ph.qdat.questions[qid].answers, function(index, value)
            {
                // build the html depending on answer type
                switch(value.a_type)
                {
                    case 'button':
                    case 'justnowbtn':
                        ans_block =
                            '<button class="btn-' + value.a_colour +
                                '" id="' + value.a_id + '">\n' +
                            '\t<span class="fa fa-2x ' + value.a_icon + '"></span>\n' +
                            '\t<p>' + value.a_text + '</p>\n' +
                            '</button>';
                        // console.log('Answer ' + value.a_id);
                        break;
                    case 'numpick':
                        num_box =
                            '\t<input type="number" name="ans_numpick" ' +
                            'id="ans_numpick" pattern="[0-9]*" min="1" ' + 'max="1440" value="5">\n';
                        ans_block = 
                            '<button class="btn-' + value.a_colour +
                                '" id="' + value.a_id + '">\n' +
                            num_box +
                            '\t<p>' + value.a_text + '</p>\n' +
                            '</button>';
                            // $('#ph-quiz').append(num_box);
                        break;
                    case 'dtpick':
                        dt_box =
                            '\t<input type="datetime-local" name="ans_dtpick" id="ans_dtpick" min="2000-01-01" value="' +
                            moment().local().format('YYYY-MM-DTHH:mm') + '">';
                        ans_block = 
                            '<button class="btn-' + value.a_colour +
                                '" id="' + value.a_id + '">\n' +
                            dt_box +
                            '\t<p>' + value.a_text + '</p>\n' +
                            '</button>';
                        break;
                    default:
                        throw 'Button type unspecified for ' + value.a_id;
                }
                
                // add the html, attach an click/touch event handler 
                $('#ph-quiz').append(ans_block);
                $('#' + value.a_id).on('click touch',
                    { qid: qid, answer: value },
                    ph.on_answer_click);
                
                // stop child event handlers from num/dt pickers propogating
                switch(value.a_type)
                {
                    case 'numpick':
                        $('#ans_numpick').on('click touch', function(event)
                        {
                            event.stopPropagation();
                        });
                        break;
                    case 'dtpick':
                        $('#ans_dtpick').on('click touch', function(event)
                        {
                            event.stopPropagation()
                        });
                }
            });
        }
        // make it visible again!
        $('#ph-quiz').fadeToggle('fast');
    }

    /* on_answer_click:
        - record aid and the goto qid (in case we have to quit in a hurry)
        - trigger a fadeout of the html block
        - register callback for the animation end for the switchover */
    pub.on_answer_click = function(event)
    {
        // disable default a tag event handling
        event.preventDefault();

        // record answer—this depends on the answer type!
        ans_time = '';
        switch(event.data.answer.a_type)
        {
            case 'button':
                ph.answers.log[ph.answers.log.length - 1].ans = event.data.answer.a_id;
                break;
            case 'justnowbtn':
                ans_time = $.now();
                // ph.answers[ph.answers.length - 1].ans = $.now();
                break;
            case 'numpick':
                ans_time = $.now() - (1000 * 60 * $('#ans_numpick').val());
                break;
            case 'dtpick':
                ans_time = parseInt(moment($('#ans_dtpick').val()).format('x'));
        }
        if (event.data.answer.a_type !== 'button')
        {
            // add time to the list
            ph.answers.log[ph.answers.log.length - 1].ans = ans_time;
            if (ph.answers['times'] === undefined)
            {
                ph.answers.times = [];
            }
            ph.answers.times.push(ans_time);
        }
        
        // record answer, sync w/ localStorage
        ph.answers.log.push({ qid: event.data.answer.goto_qid });
        localStorage.answers = JSON.stringify(ph.answers);

        // hide, wipe last question and load next one
        $('#ph-quiz').fadeToggle('fast', function()
        {
            $('#ph-quiz').empty();
            ph.create_question(event.data.answer.goto_qid);
        });
    }

    /* render_history: read through report_history and create html elements
       for each element in the array */
    pub.render_history = function()
    {
        // hide the block for a tic
        $('#ph-history').css('display', 'none');
        if (localStorage.report_history !== undefined)
        {
            // history available, check length
            ph.report_history = JSON.parse(localStorage.report_history);
            if (ph.report_history.length !== 0)
            {
                // empty out old rendered history
                $('#ph-history').empty();

                // append the header, social sharers and list scaffolding
                $('#ph-history').css('display', 'block');
                $('#ph-history').append(
                    '<h2 id="history-header"></h2>');
                $('#ph-history').append(
                    '<div id="history-share-btns"></div>');
                
                $('#history-share-btns').append(
                    '<a class="twitter-share-button" ' +
                    'id="history-share-twitter" data-size="large">Tweet</a>');
                $('#history-share-btns').append(
                    '<div class="fb-share-button" data-href="http://rensa.co/please-hold" data-layout="button" data-size="large" data-mobile-iframe="true"><a class="fb-xfbml-parse-ignore" target="_blank" href="https://www.facebook.com/sharer/sharer.php?u=http%3A%2F%2Frensa.co%2Fplease-hold&amp;src=sdkpreparse">Share</a></div>');
                $('#history-share-btns').append(
                    '<a id="history-share-linkedin">' +
                    '<span class="fa fa-linkedin-square"></span><span>Share</span></a>');
                $('#ph-history').append('<ul id="ph-history-list"></ul>');
                
                // append the history items in reverse order
                total_time_wasted = 0;
                $($("li").get().reverse())
                $.each(ph.report_history.reverse(), function(index, value)
                {
                    // determine fa icon based on action
                    icon = '';
                    switch (value.what)
                    {
                        case 'Called':
                            icon = 'fa-phone';
                            break;
                        case 'Visited':
                            icon = 'fa-building';
                            break;
                        case 'Did paperwork for':
                            icon = 'fa-paper-plane';
                            break;
                        case 'Did something for':
                            icon = 'fa-thumb-tack';
                            break;
                        default:
                            icon = 'fa-thumb-tack';
                    }
                    tw = value.time_wasted;
                    total_time_wasted = total_time_wasted + tw; 
                    if (tw > 59)
                    {
                        tw = Math.round((tw / 60) * 10) / 10;
                        tw = tw + ' hours wasted'
                    }
                    else
                    {
                        tw = Math.round(tw);
                        if (tw <= 1)
                        {
                            tw = '1 minute wasted';
                        }
                        else
                        {
                            tw = tw + ' minutes wasted'
                        }
                    }
                    
                    next_ans =
                        '<li class="ph-history-ans">\n' +
                            '\t<h3 class="ans-header">\n' +
                                '\t\t<span class="fa fa-lg ' + icon +
                                    '"></span>\n' +
                                '\t\t' + value.what + ' ' + value.who + '\n' +
                            '\t</h3>\n' +
                            '\t<p><em>' + tw + ' ' +
                                moment(value.when).fromNow() + '</em></p>\n' +
                            '\t<p class="report-notes">' + value.notes +
                                '</p>\n'
                        '</li>'

                    // write it
                    $('#ph-history-list').append(next_ans);
                });

                // add it up and change the header
                if (total_time_wasted > 59)
                {
                    total_time_wasted =
                        Math.round((total_time_wasted / 60) * 10) / 10;
                    total_time_wasted = total_time_wasted +
                        ' hours wasted'
                }
                else
                {
                    total_time_wasted = Math.round(total_time_wasted);
                    if (total_time_wasted <= 1)
                    {
                        total_time_wasted = '1 minute wasted';
                    }
                    else
                    {
                        total_time_wasted = total_time_wasted +
                            ' minutes wasted'
                    }
                }
                
                // update thee hader and sharers with time wasted
                $('#history-header').text(total_time_wasted);
                $('#history-share-twitter').attr('href',
                    'https://twitter.com/intent/tweet?text=' +
                    total_time_wasted + ' with Centrelink:' +
                    '&via=pleasehold_app' +
                    '&related=rensa_co');
                $('#history-share-linkedin').attr('href',
                    'https://www.linkedin.com/shareArticle?' +
                    'url=http://rensa.co/please-hold&mini=true&' +
                    'title=Please Hold%3A ' + total_time_wasted + '&' +
                    'summary=Track the time you waste with Centrelink. ' + 'Everything stays on your device.&' +
                    'source=http://rensa.co/please-hold');
                
                // add button for deleting data, plus event handlers
                $('#ph-history').append(
                    '<button id="history-delete" class="btn-lgrey">\n' +
                    '\t<span class="fa fa-2x fa-trash"></span>\n' +
                    '\t<h3>Delete history</h3>\n' +
                    '\t<h3 id="history-delete-confirm" ' +
                    'style="display:none;">Really?</h3>\n' +
                    '</button>');
                $('#history-delete').on('touch click', function()
                {
                    $('#history-delete-confirm').fadeToggle('slow', function()
                    {                     
                        // switch event handler to actual deletion 
                        $('#history-delete').off('touch click');
                        $('#history-delete').on(
                            'touch click', function()
                        {
                            $('#ph-quiz').empty();
                            localStorage.clear();
                            ph.start_quiz();
                        });
                    });
                });
                // $('#history-delete-confirm').css('display', 'none');
            }
        }
    }

    /* finish_quiz: record the last answer, add these answers to the report_history
       stack, and set the quiz back up */
    pub.finish_quiz = function(event)
    {
        // record notes as answer
        ph.answers.log[ph.answers.log.length - 1].ans =
            ph.htmlEncode($('#phq-wrapup-text').val());

        // calc time wasted in mins and start time
        ph.answers.times = ph.answers.times.sort();
        ph.answers.report = {};
        ph.answers.report.time_wasted =
            (ph.answers.times[ph.answers.times.length - 1] -
            ph.answers.times[0]) / 60000;
        ph.answers.report.when = ph.answers.times[0];
        
        // who and what - need to cycle through answer log for these!
        $.each(ph.answers.log, function(index, value)
        {
            if (value.qid === 'phq-who')
            {
                ph.answers.report.who = value.ans;
            }
            else if (value.qid === 'phq-mode')
            {
                ph.answers.report.what = value.ans;
            }
        });

        // format who and what
        switch (ph.answers.report.who)
        {
            case 'pha-who-centrelink':
                ph.answers.report.who = 'Centrelink';
                break;
            case 'pha-who-jobprovider':
                ph.answers.report.who = 'Job Services Provider';
                break;
            case 'pha-who-other':
                ph.answers.report.who = 'someone else';
                break;
            default:
                ph.answers.report.who = 'someone else';
        }
        switch (ph.answers.report.what)
        {
            case 'pha-mode-call':
                ph.answers.report.what = 'Called';
                break;
            case 'pha-mode-visit':
                ph.answers.report.what = 'Visited';
                break;
            case 'pha-mode-paperwork':
                ph.answers.report.what = 'Did paperwork for';
                break;
            case 'pha-mode-other':
                ph.answers.report.what = 'Did something for';
                break;
            default:
                ph.answers.report.what = 'Unknown action for';
        }
        ph.answers.report.notes =
            ph.answers.log[ph.answers.log.length - 1].ans;
        
        // sync w/ localStorage
        if (localStorage.report_history === undefined)
        {
            ph.report_history = [];
        }
        else
        {
            ph.report_history = JSON.parse(localStorage.report_history);
        }
        ph.report_history.push(ph.answers.report);
        localStorage.report_history = JSON.stringify(ph.report_history);
        
        // delete answers now they're in report_history
        localStorage.removeItem('answers');
        ph.answers = undefined;

        // remove last question and reset
        $('#ph-quiz').fadeToggle('fast', function()
        {
            $('#ph-quiz').empty();
            ph.start_quiz();
        });
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

    return pub;
})();

/* ready: do prereq checks and load quiz data */
$(document).ready(function()
{    
    // twitter setup
    window.twttr = (function(d, s, id)
    {
    var js, fjs = d.getElementsByTagName(s)[0],
        t = window.twttr || {};
    if (d.getElementById(id)) return t;
    js = d.createElement(s);
    js.id = id;
    js.src = "https://platform.twitter.com/widgets.js";
    fjs.parentNode.insertBefore(js, fjs);

    t._e = [];
    t.ready = function(f) {
        t._e.push(f);
    };

    return t;
    }(document, "script", "twitter-wjs"));

    // get things started
    try
    {
        ph.start_quiz();       
    }
    catch(err)
    {
        $('#ph-loading').text('Error: ' + err.message);
        $('#ph-loading').css('display', 'block');
        console.error(err);
    }
});
