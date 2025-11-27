$(function() {
    $('#question').val('');
    $('.add-question-btn').click(function(){
        $(this).attr('hidden','true');
        $('.add-question-section').removeAttr('hidden');
    });
    $('.close-question-btn').click(function(){
        $('.add-question-btn').removeAttr('hidden');

        $('.add-question-section').attr('hidden','true');
        $('#question').val('');
    });
});