import React from 'react';
import './App.css';
import client_id from './config';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: '',
      playlists: [],
      auth: '',
      dupes: [],
      selected: ''
    };
  }

  componentDidMount() {
    if (window.location.hash) {
      const hashMap = {
        access_token: '',
        token_type: '',
        expires_in: ''
      };
      window.location.hash.substring(1).split('&').forEach(item => {
        const i = item.split('=');
        hashMap[i[0]] = i[1];
      });
      fetch('https://api.spotify.com/v1/me/playlists', {
        headers: {
          'Authorization': `${hashMap['token_type']} ${hashMap['access_token']}`
        }
      })
        .then((res => res.json()))
        .then(res => {
          const firstIndex = res['href'].indexOf('https://api.spotify.com/v1/users/') + 'https://api.spotify.com/v1/users/'.length;
          const lastIndex = res['href'].lastIndexOf('/');
          this.setState({
            user: res['href'].substring(firstIndex, firstIndex + (lastIndex - firstIndex)),
            playlists: res['items'],
            auth: `${hashMap['token_type']} ${hashMap['access_token']}`
          });
        })
    }
  }

  async handleClick(item) {
    this.setState({ dupes: [] });
    await fetch(item.href, {
      headers: {
        'Authorization': this.state.auth
      }
    })
      .then(async res => res.json())
      .then(async response => {
        this.setState({ selected: response.name });
        const items = response.tracks.items;
        const tracks = new Map();
        const dupes = [];
        this.checkForDuplicateItems(items, tracks, dupes);
        let next = response.tracks.next;
        while (next !== null) {
          const res = await fetch(next, {
            headers: { 'Authorization': this.state.auth }
          }).then(res => res.json());
          if (res && res.items) {
            this.checkForDuplicateItems(res.items, tracks, dupes);
          }
          next = res.next;
        }
        if (dupes.length > 0) {
          this.setState({ dupes });
        }
      });
  }

  checkForDuplicateItems(items, tracks, dupes) {
    for (const item of items) {
      const track = item.track;
      const name = track.name;
      const artist = track.artists.length === 1 ? track.artists[0].name : this.findArtistName(track.artists);
      const indexName = `${name} by ${artist}`;
      const album = track.album.name;
      if (!tracks.has(indexName)) {
        tracks.set(indexName, {
          album,
          name,
          artist
        });
      } else {
        dupes.push({
          old: {
            indexName,
            name: tracks.get(indexName) ? tracks.get(indexName).name : tracks.get(indexName),
            artist: tracks.get(indexName) ? tracks.get(indexName).artist : tracks.get(indexName),
            album: tracks.get(indexName) ? tracks.get(indexName).album : tracks.get(indexName)
          },
          new: {
            indexName,
            name,
            album,
            artist,
          }
        });
      }
    }
  }

  findArtistName(artistArray) {
    let result = '';
    for (let i = 0; i < artistArray.length; i++) {
      result += artistArray[i].name;
      if (i + 1 < artistArray.length) {
        if (i + 2 < artistArray.length) {
          result += ', ';
        } else {
          result += ' and ';
        }
      }
    }
    return result;
  }

  render() {
    if (!window.location.hash) {
      window.location.replace(`https://accounts.spotify.com/authorize` +
        `?response_type=token&client_id=${client_id}` +
        `&scope=${encodeURIComponent('user-read-private user-read-email')}` +
        `&redirect_uri=${encodeURIComponent('https://bgoff1-projects.github.io/spotify-playlist-groomer/')}`, {
          credentials: 'include'
        });
      return null;
    }
    return <div>
      <h1 className="subtitle" style={{ marginLeft: '1em', marginTop: '1em', marginBottom: '0.5em' }}>Scanning playlists for: {this.state.user}</h1>
      <div style={{ marginLeft: '1em', marginRight: '1em' }} className="list is-hoverable">
        {this.state.playlists.map((item, index) =>
          <span className="list-item" key={'playlist name ' + item.name} onClick={() => this.handleClick(item)}>{item.name}</span>
        )}
      </div>
      <hr />
      {this.state.selected ?
        <span>
          <h3>Dupliates for {this.state.selected}</h3>
          {this.state.dupes.length === 0 ? 'None' :
            <div>
              {this.state.dupes.map((item) => {
                const name = item.old.indexName.split(' by ');
                const ulName = <span><i>{name[0]}</i> by <strong>{name[1]}</strong></span>
                return <span key={item.old.indexName}>
                  <span>{ulName}</span>
                  <div style={{ paddingBottom: '2em' }}>
                    <div style={{ paddingLeft: '2em' }}>Old:
                      <div style={{ paddingLeft: '2em' }}>
                        <div>
                          Name: {item.old.name}
                        </div>
                        <div>
                          Album: {item.old.album}
                        </div>
                        <div>
                          Artist(s): {item.old.artist}
                        </div>
                      </div>
                    </div>
                    <div style={{ paddingLeft: '2em' }}>New:
                      <div style={{ paddingLeft: '2em' }}>
                        <div>
                          Name: {item.new.name}
                        </div>
                        <div>
                          Album: {item.new.album}
                        </div>
                        <div>
                          Artist(s): {item.new.artist}
                        </div>
                      </div>
                    </div>
                  </div>
                </span>
              })
              }
            </div>}
        </span> : ''}

    </div>;
  }
}

export default App;
