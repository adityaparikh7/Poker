import React, { Component } from "react";
import ReactAudioPlayer from "react-audio-player";

class MusicPlayer extends Component {
  state = {
    playlist: [],
    currentSongIndex: 0,
  };

  componentDidMount() {
    this.fetchPlaylist();
  }

  fetchPlaylist = () => {
    fetch("/api/playlist")
      .then((response) => response.json())
      .then((data) => {
        this.setState({ playlist: data });
      })
      .catch((error) => {
        console.error(error);
      });
  };

  render() {
    const { playlist, currentSongIndex } = this.state;

    return (
      <div>
        {playlist.length > 0 && (
          <div>
            <h2>{playlist[currentSongIndex].title}</h2>
            <ReactAudioPlayer
              src={playlist[currentSongIndex].file}
              autoPlay
              controls
            />
          </div>
        )}
      </div>
    );
  }
}

export default MusicPlayer;
