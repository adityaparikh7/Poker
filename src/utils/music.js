import React, { Component } from "react";
import "./MusicPlayer.css";

class MusicPlayer extends Component {
  state = {
    playlist: [],
    currentSongIndex: 0,
    audioPlayer: new Audio(),
  };

  componentDidMount() {
    this.fetchPlaylist();
  }

  fetchPlaylist = () => {
    fetch("/api/playlist")
      .then((response) => response.json())
      .then((data) => {
        this.setState({ playlist: data }, () => {
          this.loadSong();
        });
      })
      .catch((error) => {
        console.error(error);
      });
  };

  loadSong = () => {
    const { playlist, currentSongIndex, audioPlayer } = this.state;
    const { file, title } = playlist[currentSongIndex];

    audioPlayer.src = file;
    audioPlayer.load();

    this.setState({
      currentSongTitle: title,
      audioPlayer,
    });
  };

  playSong = () => {
    const { audioPlayer } = this.state;
    audioPlayer.play();
  };

  pauseSong = () => {
    const { audioPlayer } = this.state;
    audioPlayer.pause();
  };

  nextSong = () => {
    const { currentSongIndex, playlist } = this.state;
    if (currentSongIndex < playlist.length - 1) {
      this.setState({ currentSongIndex: currentSongIndex + 1 }, () => {
        this.loadSong();
        this.playSong();
      });
    }
  };

  render() {
    const { audioPlayer, currentSongTitle } = this.state;

    return (
      <div>
        <h2>{currentSongTitle}</h2>
        <audio controls ref={(ref) => (this.audioElement = ref)} />
        <div>
          <button onClick={this.playSong}>Play</button>
          <button onClick={this.pauseSong}>Pause</button>
          <button onClick={this.nextSong}>Next</button>
        </div>
      </div>
    );
  }
}

export default MusicPlayer;
