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
    
    /* create_question: */
    pub.create_question = function(qid)
    {
        console.log('Creating question: ' + qid);

        // question text
        $('#ph-quiz').append(
            '<p id="q_text">' +
            ph.qdat.questions[qid].q_text +
            '</p>');

        // answers
        $.each(ph.qdat.questions[qid].answers, function(index, value)
        {
            ans_block =
                '<div class="btn-' + value.a_colour + ' ' +
                    value.a_id + '">\n' +
                '\t<span class="fa ' + value.a_icon + '"></span>\n' +
                '\t<p>' + value.a_text + '</p>\n' +
                '</div>';
            
            $('#ph-quiz').append(ans_block);
        });
    }

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
        }
        else
        {
            // start with current question
            // (last q in array; has qid but not aid)
            ph.answers = JSON.parse(localStorage.answers);
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

/* DEPRECIATED ============================================================== */

/* event handler functions for quiz buttons. these switch the question block
   and record the answer to local storage. a few grab a number of minutes from
   the adjacent text input */

// function click_ph_start_call()
// {
//     document.getElementById('ph-start').style.display = 'none'
//     document.getElementById('ph-call-startdt').style.display = 'block'
//     localStorage.setItem('start', 'Call')
// }
