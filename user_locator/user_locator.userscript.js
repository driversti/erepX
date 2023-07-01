// ==UserScript==
// @name         eRepublik User Locator
// @version      1.0
// @description  allows to track a player's location
// @author       driversti https://www.erepublik.com/en/citizen/profile/4690052
// @downloadURL
// @updateURL
// @match        https://www.erepublik.com/*
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=erepublik.com
// @grant        none
// ==/UserScript==

(async function () {
  'use strict';

  await applyStyles();
  await addPlayerLocatorDiv();
})();

async function getPlayerData(id) {
  const response = await fetch(`https://www.erepublik.com/en/main/citizen-profile-json-personal/${id}`, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': navigator.userAgent,
      Cookie: document.cookie
    },
  })
  return await response.json();
}

function savePlayers(players) {
  localStorage.setItem('locatorPlayers', JSON.stringify(players))
}

function loadPlayers() {
  return JSON.parse(localStorage.getItem('locatorPlayers')) || []
}

function addPlayerLocatorDiv() {
  const trackerHTML = `
  <div id="playerTracker" style="border:1px solid black;">
    <table id="playersTable">
      <thead>
        <tr id="locatorHeader">
          <th class="col">Player</th>
          <th class="col">Location</th>
          <th class="col">Remove</th>
        </tr>
      </thead>
      <tbody id="players">
      </tbody>
    </table>
    <div class="input-button-wrapper">
      <input id="playerID" type="number" placeholder="Player ID">
      <button id="addToTrackingButton">Add</button>
    </div>
    <div class="input-button-wrapper">
      <input id="updateInterval" type="number" placeholder="Update every X seconds">
      <button id="setIntervalButton">Set</button>
    </div>
  </div>`;

  const container = document.createElement('div');
  container.innerHTML = trackerHTML;
  document.body.appendChild(container);
  const addToTrackingButton = document.getElementById('addToTrackingButton');
  addToTrackingButton.addEventListener('click', addPlayerToTracker);
  const setIntervalButton = document.getElementById('setIntervalButton');
  setIntervalButton.addEventListener('click', setIntervalOfTracking);

  const playerTracker = document.getElementById('playerTracker');
  const savedPosition = JSON.parse(localStorage.getItem('playerTrackerPosition')) || {left: '350px', top: '380px'};
  console.log(`Saved position: ${JSON.stringify(savedPosition)}`);
  Object.assign(playerTracker.style, {
    position: 'absolute',
    backgroundColor: '#e0dede',
    width: '300px',
    left: savedPosition.left,
    top: savedPosition.top,
    zIndex: '2001'
  });
  populateWithPlayers();
  makeElementDraggable(playerTracker);
}

function setIntervalOfTracking() {
  console.log('Not implemented yet');
}

function makeElementDraggable(element) {
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;

  // When the user presses the mouse button, start dragging
  element.addEventListener('mousedown', (event) => {
    offsetX = event.clientX - element.offsetLeft;
    offsetY = event.clientY - element.offsetTop;
    isDragging = true;
  });

  // When the user moves the mouse, reposition the element
  document.addEventListener('mousemove', (event) => {
    if (isDragging) {
      element.style.left = `${event.clientX - offsetX}px`;
      element.style.top = `${event.clientY - offsetY}px`;
      // Save the new position in local storage
      localStorage.setItem('playerTrackerPosition', JSON.stringify({
        left: element.style.left,
        top: element.style.top
      }));
      // console.log(`Saving position: ${element.style.left}:${element.style.top}`)
    }
  });

  // When the user releases the mouse button, stop dragging
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

function populateWithPlayers() {
  loadPlayers()
    .filter(p => !p.paused)
    .sort((a, b) => a.id - b.id)
    .forEach(p => addPlayerRow(p.id));
}

async function addPlayerRow(id, paused = false) {
  console.log(id)
  const data = await getPlayerData(id);
  // console.log(`Profile data: ${JSON.stringify(data)}`)
  const name = data.citizen.name;
  const country = data.location.residenceCountry.name;
  const region = data.location.residenceRegion.name;
  const isOnline = data.citizen.onlineStatus;
  const playerRow = createPlayerRow(id, name, `${country}, ${region}`, isOnline);
  const playersDiv = document.getElementById('players');
  playersDiv.appendChild(playerRow);
}

function createPlayerRow(id, name, location, isOnline) {
  const row = document.createElement('tr');
  row.id = `player-${id}`
  row.className = 'player-row';

  const button = document.createElement('button');
  button.style.width = 'fit-content';
  button.textContent = 'X';
  button.addEventListener('click', () => removePlayerFromLocator(id));

  row.innerHTML = `
    <td class="col">
      <a href="https://www.erepublik.com/en/citizen/profile/${id}" target="_blank">
        <span class="col ${isOnline ? 'online' : 'offline'}">${name} (${id})</span>
      </a>
    </td>
    <td class="col">${location}</td>
    <td class="col"></td> 
    `;

  row.children[2].appendChild(button); // append the button to the third cell

  return row;
}

function removePlayerFromLocator(id) {
  console.log(`Remove player ${id}`)
  // Remove the player's row from the DOM
  const playerRow = document.getElementById(`player-${id}`);
  playerRow.remove();

  let players = loadPlayers();
  players = players.filter(player => player.id !== id);

  // Save the updated list of player IDs back to local storage
  savePlayers(players);
}

async function addPlayerToTracker() {
  const playerIdInput = document.getElementById('playerID');
  const id = playerIdInput.value;
  console.log(`https://www.erepublik.com/en/citizen/profile/${id}`)

  await addPlayerRow(id);

  // Save the player ID in local storage
  const players = loadPlayers();
  players.push({id: id, paused: false});
  savePlayers(players);

  playerIdInput.value = '';
}

function applyStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .trackerWrapper {
        border: 5px solid red;
    }
        
    #playerTracker {
        width: 300px; 
        box-sizing: border-box;
    }

    #playerTracker #locatorHeader, 
    #playerTracker .player-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    #playerTracker .col {
        flex: 1;
        padding: 5px;
        text-align: left
    }

    #playerTracker .col:first-child {
        flex: 3; 
    }

    #playerTracker .col:last-child {
        flex: 0.5;
        text-align: center;
    }

    #playerTracker .online {
        color: green;
    }

    #playerTracker .offline {
        color: red;
    }

    #playerTracker .input-button-wrapper {
        display: flex;
        justify-content: space-between;
        margin-top: 5px;
    }

    #playerTracker input[type="number"] {
        flex: 1;
        margin-right: 10px;
    }

    #playerTracker button {
        width: 50px;
    }
    
    .player-row .online {
      color: green;
    }
    
    .player-row .offline {
      color: red;
    }
    `;
  document.head.append(style);
}