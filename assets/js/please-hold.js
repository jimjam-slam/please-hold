/* custom js to support the please hold web app
   james goldie, august 2016
*/

$( document ).ready(function(){
    alert('JQuery ready!');
    
    // load the quiz file
    $.getJSON('/assets/quiz-pleasehold.json', function(qd) {
        alert('Quiz file loaded! ' + qd.title);

    // get current question id from localStorage

    // build the current question elements

    });
});

/* event handler functions for quiz buttons. these switch the question block
   and record the answer to local storage. a few grab a number of minutes from
   the adjacent text input */

// function click_ph_start_call()
// {
//     document.getElementById('ph-start').style.display = 'none'
//     document.getElementById('ph-call-startdt').style.display = 'block'
//     localStorage.setItem('start', 'Call')
// }
