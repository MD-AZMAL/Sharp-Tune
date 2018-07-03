const electron = require('electron');
const remote = electron.remote;
const ipc = electron.ipcRenderer;
const fs = require('fs');
const mm = require('musicmetadata');

const volume_slider = $('.vol-progress');
const volume_current = $('.vol-current');
const play_header = $('.play-header');
const folder_name = $('.folder');
const progress = $('.progress');
const current = $('.current');
const current_play = $('.current-song');
const song_duration = $('.seek-duration');
const seek_pos = $('.seek-pos');
const pl_pa = $('#play');
const next = $('#next');
const prev = $('#prev')
const vol = $('#vol');
const list = $('.list');
const song_list = $('ul');
const canvas = $('#visualCanvas')[0];

var global_volume = volume_current.width() / volume_slider.width() * 100;
var prev_vol = global_volume;
var global_loc;
var current_song;
var curren_index;
var playList = []
var sl;

var context = new AudioContext();
var c;
var analyser;
var bufferLen;
var source;
var fbc_arr;
var bar_x, bar_width, bar_height;

ipc.on('selected-folder', (event, obj) => {
    reset_ui();
    if (current_song) {
        current_song.pause();
        current_song = null;
        current_play.html(' ');
    }
    let gi = 0;
    curren_index = 0;
    sl = obj.sl;
    folder_name.html(obj.loc.split(sl)[obj.loc.split(sl).length - 1]);
    playList = [];
    global_loc = obj.loc;
    obj.files.forEach((file) => {
        if (file.endsWith('.wav') || file.endsWith('.WAV')) {
            let tmp = new Audio();
            tmp.src = global_loc + sl + file;
            tmp.loop = false;
            tmp.onloadeddata = function () {
                playList.push({
                    index: gi,
                    song: file,
                    song_name: file,
                    duration: tmp.duration
                })
                song_list.append(`<li class="list">
            <span class="index">${playList[gi].index + 1}</span>
            <span class="song">${playList[gi].song_name}</span>
            <span class="duration">${toTime(playList[gi].duration)}</span>
            </li>`);
                gi++;
            }

        } else {
            var parser = mm(fs.createReadStream(global_loc + sl + file), { duration: true }, function (err, metadata) {
                if (!err) {
                    playList.push({
                        index: gi,
                        song: file,
                        song_name: metadata.title || file,
                        duration: metadata.duration
                    });
                    song_list.append(`<li class="list">
                    <span class="index">${playList[gi].index + 1}</span>
                    <span class="song">${playList[gi].song_name}</span>
                    <span class="duration">${toTime(playList[gi].duration)}</span>
                    </li>`);
                    gi++;
                }
            });
        }
    });

});

ipc.on('update-download', (event, perc) => {
    play_header.html('Download Progress : ' + parseInt(perc) + '%');
});

function reset_ui() {
    current_play.html('&nbsp;'); // \u00a0 is non-breakable space
    song_duration.html('0:00');
    seek_pos.html('0:00');
    current.css('width', '0%');
    song_list.html('');
}

volume_slider.mousedown(function (event) {
    init_global_vol(event.pageX);
    volume_slider.mousemove(function (event) {
        init_global_vol(event.pageX);
        prev_vol = global_volume;
    });
    prev_vol = global_volume;
});

progress.mousedown(function (event) {
    init_seek(event.pageX);
    progress.mousemove(function (event) {
        init_seek(event.pageX);
    });
});

$(document).mouseup(function (event) {
    volume_slider.off('mousemove');
    progress.off('mousemove');
});

vol.on('click', toggle_mute);

pl_pa.on('click', function () {
    if (current_song) {
        toggle_play();
    }
});

next.on('click', next_song);

prev.on('click', prev_song);

song_list.on('click', 'li', function (event) {
    curren_index = $(this).children().eq(0).html() - 1;
    song_change();
})

function toTime(seconds) {
    var min = Math.floor(seconds / 60) || 0;
    var sec = parseInt(seconds - min * 60) || 0;
    return min + ':' + (sec < 10 ? '0' : '') + sec;
}

function song_change() {
    song_list.children().removeClass('selected');
    song_list.children().eq(curren_index).addClass('selected');
    init_play();
}

function init_global_vol(mx) {
    let rp = parseInt(volume_slider.offset().left);
    let w = parseInt(volume_slider.width());
    let rmx = mx - rp;
    global_volume = (mx - rp) / w * 100;
    volume_current.css('width', global_volume + '%');
    if (current_song) {
        let tmp_vol = ((global_volume / 100) > 1) ? 1 : global_volume / 100;
        current_song.volume = tmp_vol;
    }
}

function init_seek(mx) {
    if (current_song) {
        let rp = parseInt(progress.offset().left);
        let w = parseInt(progress.width());
        let dx = current_song.duration / w;
        let rmx = mx - rp
        current_song.currentTime = (dx * rmx);
        let perc = rmx / w * 100;
        current.css('width', perc + '%');
    }
}

function update_seek() {
    requestAnimationFrame(update_seek);
    if (current_song) {
        seek_pos.html(toTime(current_song.currentTime));
        let w = parseInt(progress.width());
        let dy = w / current_song.duration;
        current.css('width', (dy * current_song.currentTime));
    }
}

function change_pl_ico() {
    if (!current_song.paused) {
        pl_pa.removeClass('fa-play');
        pl_pa.addClass('fa-pause');

    } else {
        pl_pa.removeClass('fa-pause');
        pl_pa.addClass('fa-play');
    }
}

function init_play() {
    if (current_song) {
        current_song.pause();
        change_pl_ico();
    }
    current_song = new Audio();
    current_song.src = global_loc + sl + playList[curren_index].song;
    current_song.onended = next_song;
    current_song.onloadeddata = function () {
        current_play.html(playList[curren_index].song_name);
        song_duration.html(toTime(playList[curren_index].duration));
        let tmp_vol = ((global_volume / 100) > 1) ? 1 : global_volume / 100;
        current_song.volume = tmp_vol;
        toggle_play();
        initVisualiser();
    }
}

function toggle_mute() {
    if (current_song) {
        if (current_song.volume == 0) {
            let rp = parseInt(volume_slider.offset().left);
            let w = parseInt(volume_slider.width());
            init_global_vol((prev_vol * w / 100) + rp);
            vol.removeClass('fa-volume-off');
            vol.addClass('fa-volume-up');
        } else {
            prev_vol = global_volume;
            init_global_vol(parseInt(volume_slider.offset().left));
            vol.removeClass('fa-volume-up');
            vol.addClass('fa-volume-off');
        }
        volume_current.css('width', global_volume + '%');
    }
}

function toggle_play() {
    if (!current_song.paused) {
        current_song.pause();
    } else {
        current_song.play();
    }
    change_pl_ico();
}

function next_song() {
    if (curren_index == playList.length - 1) {
        curren_index = 0
    } else {
        curren_index++;
    }
    song_change();
}

function prev_song() {
    if (curren_index == 0) {
        curren_index = playList.length - 1;
    } else {
        curren_index--;
    }
    song_change();
}

// visualiser


function initVisualiser() {
    c = canvas.getContext('2d');

    let grd = c.createLinearGradient(0, canvas.height, 0, canvas.height / 1.3);
    grd.addColorStop(0, "#DC0A2A");
    grd.addColorStop(1, '#ff0000');
    c.fillStyle = grd;

    analyser = context.createAnalyser();
    source = context.createMediaElementSource(current_song);
    source.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 1024;
    bufferLen = analyser.frequencyBinCount
    fbc_arr = new Uint8Array(bufferLen);
    frameLoop();
}

function frameLoop() {
    window.requestAnimationFrame(frameLoop);
    analyser.getByteFrequencyData(fbc_arr);
    c.clearRect(0, 0, canvas.width, canvas.height);

    bar_x = 0;
    bar_width = parseInt((canvas.width / bufferLen) * 2.5);
    for (let i = 0; i < bufferLen; i++) {
        bar_height = fbc_arr[i] / 3;
        c.fillRect(bar_x, canvas.height, bar_width, - parseInt(bar_height));
        bar_x += bar_width + 2;
    }
}

update_seek();