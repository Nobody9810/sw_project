$(function() {
    const main_video = document.querySelector('.main-video video');

    let videos = document.querySelectorAll('.video');
    videos[0].classList.add('active');
    videos[0].querySelector('.date').classList.remove('text-muted');
    videos[0].querySelector('.pause').classList.remove('hidden');
    videos[0].querySelector('.play').classList.add('hidden');

    $(".video").click(function(){
        $(".video").removeClass('active');
        $('.pause').addClass('hidden');
        $('.play').removeClass('hidden');
        $('.date').addClass('text-muted');
        $(this).addClass('active');
        $(this).children('.vid-ctrl').children('.pause').removeClass('hidden');
        $(this).children('.vid-ctrl').children('.play').addClass('hidden');
        $(this).children().first().children('.date').removeClass('text-muted');
        $('.main-video video').attr('src',$(this).attr('data-value'));

    });




});