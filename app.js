const fs = require("fs");
var ProgressBar = require("progress");
const axios = require("axios");

const INFO_URL = "https://slider.kz/vk_auth.php?q=";
const DOWNLOAD_URL = "https://slider.kz/download/";
let index = -1;
let songsList = [];
let total = 0;
let notFound = [];

// CR - Connection Refused
// NF - Not Found
// UC - Unescaped Character

const download = async (song, url) => {
  try {
    let numb = index + 1;
    console.log(`(${numb}/${total}) Starting download: ${song}`);
    const { data, headers } = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
    });

    //for progress bar...
    const totalLength = headers["content-length"];
    const progressBar = new ProgressBar(
      "-> downloading [:bar] :percent :etas",
      {
        width: 40,
        complete: "=",
        incomplete: " ",
        renderThrottle: 1,
        total: parseInt(totalLength),
      }
    );

    data.on("data", (chunk) => progressBar.tick(chunk.length));
    data.on("end", () => {
      console.log("DOWNLOADED!\n");
      startDownloading(); //for next song!
    });

    //for saving in file...
    data.pipe(fs.createWriteStream(`${__dirname}/songs/${song}.mp3`));
  } catch {
    console.log("Error - CR : " + song);
    console.log(
      "---------------------------------------------------------------------------------------------------\n"
    );
    startDownloading();
  }
};

const getURL = async (song, singer) => {
  try {
    let query = (song + "%20" + singer).replace(/\s/g, "%20");
    // console.log(INFO_URL + query);
    const { data } = await axios.get(INFO_URL + query);

    // when no result then [{}] is returned so length is always 1, when 1 result then [{id:"",etc:""}]
    if (!data["audios"][""][0].id) {
      //no result
      console.log("Error - NF : " + song);
      console.log(
        "---------------------------------------------------------------------------------------------------\n"
      );
      notFound.push(song + " - " + singer);
      startDownloading();
      return;
    }

    //avoid remix,revisited,mix
    let i = 0;
    let track = data["audios"][""][i];
    let totalTracks = data["audios"][""].length;
    while (
      i < totalTracks &&
      /remix|revisited|reverb|mix/i.test(track.tit_art)
    ) {
      i += 1;
      track = data["audios"][""][i];
    }
    //if reach the end then select the first song
    if (!track) {
      track = data["audios"][""][0];
    }

    if (fs.existsSync(__dirname + "/songs/" + track.tit_art + ".mp3")) {
      let numb = index + 1;
      console.log(
        "(" +
          numb +
          "/" +
          total +
          ") - Song already present!!!!! " +
          song +
          "\n"
      );
      startDownloading(); //next song
      return;
    }

    // let link = DOWNLOAD_URL + track.id + "/";
    // link = link + track.duration + "/";
    // link = link + track.url + "/";
    // link = link + track.tit_art + ".mp3" + "?extra=";
    // link = link + track.extra;
    let link = track.url;
    link = encodeURI(link); //to replace unescaped characters from link

    let songName = track.tit_art;
    songName.replace(/\?|<|>|\*|"|:|\||\/|\\/g, ""); //removing special characters which are not allowed in file name
    download(songName, link);
  } catch {
    console.log("Error - UC : " + song);
    console.log(
      "---------------------------------------------------------------------------------------------------\n"
    );
    startDownloading();
  }
};

const startDownloading = () => {
  try {
    index += 1;
    if (index === songsList.length) {
      console.log("\n#### ALL SONGS ARE DOWNLOADED!! ####\n");
      console.log("Songs that are not found:-");
      let i = 1;
      for (let song of notFound) {
        console.log(`${i} - ${song}`);
        i += 1;
      }
      if (i === 1) console.log("None!");
      return;
    }
    let song = songsList[index].name;
    let singer = songsList[index].singer;
    getURL(song, singer);
  } catch {
    console.log("Directory error");
  }
};

console.log("STARTING....");
let playlist = require("./resso_playlist");
playlist.getPlaylist().then((res) => {
  try {
    if (res === "Some Error") {
      //wrong url
      console.log(
        "Error: maybe the url you inserted is not of resso music playlist or check your connection!"
      );
      return;
    }
    songsList = res.songs;
    total = res.total;
    console.log("Total songs:" + total + "\n");
  
    //create folder
    let dir = __dirname + "/songs";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    startDownloading();
  } catch {
    Console.log("Error - FE");
    console.log(
      "---------------------------------------------------------------------------------------------------\n"
    );
  }
});
