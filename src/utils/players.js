import uuid from 'uuid/v1';
import { handlePhaseShift, reconcilePot, anteUpBlinds, determineBlindIndices } from './bet.js';
import { dealMissingCommunityCards, showDown, generateDeckOfCards, shuffle, dealPrivateCards } from './cards.js';

const axios = require('axios')
const generateTable = async () => {
	const users = [{
		id: uuid(),
		name: 'Aditya Parikh',
		avatarURL: '/assets/boy.svg',
		cards: [],
		showDownHand: {
			hand: [],
			descendingSortHand: [], 
		},
		chips: 20000,
		roundStartChips: 20000,
		roundEndChips: 20000,
		currentRoundChipsInvested: 0,
		bet: 0,
		betReconciled: false,
		folded: false,
		allIn: false,
		canRaise: true,
		stackInvestment: 0,
		robot: false
	}];

	const response = await axios.get(`https://randomuser.me/api/?results=4&nat=in&gender=male`);
	response.data.results.map(user => {
			// const randomizedChips = Math.floor(Math.random() * (20000 - 18000)) + 18000;
			const randomizedChips = 20000;
			return ({
				id: uuid(),
				name: `${user.name.first.charAt(0).toUpperCase()}${user.name.first.slice(1)} ${user.name.last.charAt(0).toUpperCase()}${user.name.last.slice(1)}`,
				avatarURL: user.picture.large,
				cards: [],
				chips: randomizedChips,
				roundStartChips: randomizedChips,
				roundEndChips: randomizedChips,
				currentRoundChipsInvested: 0,
				showDownHand: {
					hand: [],
					descendingSortHand: [],
				},
				bet: 0,
				betReconciled: false,
				folded: false,
				allIn: false,
				robot: true,
				canRaise: true,
				stackInvestment: 0,
			})
		})
		.forEach(user => users.push(user))

	return users
}


const handleOverflowIndex = (currentIndex, incrementBy, arrayLength, direction) => {
	switch (direction) {
		case('up'): {
			return (
				(currentIndex + incrementBy) % arrayLength
			)
		}
		case('down'): {
			return (
				((currentIndex - incrementBy) % arrayLength) + arrayLength 
			)
		}
		//default: throw Error("Attempted to overfow index on unfamiliar direction");
	}
}

const determinePhaseStartActivePlayer = (state, recursion = false) => {
	if (!recursion) {
		state.activePlayerIndex = handleOverflowIndex(state.blindIndex.big, 1, state.players.length, 'up');
	} else if (recursion) {
		state.activePlayerIndex = handleOverflowIndex(state.activePlayerIndex, 1, state.players.length, 'up');
	}
		if (state.players[state.activePlayerIndex].folded) {
			return determinePhaseStartActivePlayer(state, true)
		}
		if (state.players[state.activePlayerIndex].chips === 0) {
			return determinePhaseStartActivePlayer(state, true)
		}
				return state
}

const determineNextActivePlayer = (state) => {
  state.activePlayerIndex = handleOverflowIndex(
    state.activePlayerIndex,
    1,
    state.players.length,
    "up"
  );
  const activePlayer = state.players[state.activePlayerIndex];

  const allButOnePlayersAreAllIn =
    state.numPlayersActive - state.numPlayersAllIn === 1;
  //Only one player active, skip to showdown.
  if (state.numPlayersActive === 1) {
    return showDown(reconcilePot(dealMissingCommunityCards(state)));
  }
  //Current player folded, go to next active player.
  if (activePlayer.folded) {
    return determineNextActivePlayer(state);
  }

  if (
    allButOnePlayersAreAllIn &&
    !activePlayer.folded &&
    activePlayer.betReconciled
  ) {
    return showDown(reconcilePot(dealMissingCommunityCards(state)));
  }

  //All players are all in.
  if (activePlayer.chips === 0) {
    if (state.numPlayersAllIn === state.numPlayersActive) {
      return showDown(reconcilePot(dealMissingCommunityCards(state)));
    } else if (allButOnePlayersAreAllIn && activePlayer.allIn) {
      return showDown(reconcilePot(dealMissingCommunityCards(state)));
    } else {
      return determineNextActivePlayer(state);
    }
  }

  //after all bets are accepted this will move the game to next round
  if (activePlayer.betReconciled) {
    return handlePhaseShift(state);
  }

  return state;
}


const passDealerChip = (state) => {
	state.dealerIndex = handleOverflowIndex(state.dealerIndex, 1, state.players.length, 'up');
	const nextDealer = state.players[state.dealerIndex]
	if (nextDealer.chips === 0) {
		return passDealerChip(state)
	}

		return filterBrokePlayers(state, nextDealer.name);
}


const filterBrokePlayers = (state, dealerID) => {
  const activePlayers = state.players.reduce((acc, player) => {
    if (player.chips > 0) {
      acc.push(player);
    }
    return acc;
  }, []);

  const newDealerIndex = activePlayers.findIndex(
    (player) => player.name === dealerID
  );
  const blindIndicies = determineBlindIndices(
    newDealerIndex,
    activePlayers.length
  );

  state.players = anteUpBlinds(activePlayers, blindIndicies, state.minBet).map(
    (player) => ({
      ...player,
      cards: [],
      showDownHand: {
        hand: [],
        descendingSortHand: [],
      },
      roundStartChips: player.chips + player.bet,
      currentRoundChipsInvested: 0,
      betReconciled: false,
      folded: false,
      allIn: false,
    })
  );

  state.dealerIndex = newDealerIndex;
  state.blindIndex = {
    big: blindIndicies.bigBlindIndex,
    small: blindIndicies.smallBlindIndex,
  };
  state.numPlayersAllIn = 0;
  state.numPlayersFolded = 0;
  state.numPlayersActive = state.players.length;

  return dealPrivateCards(state);
};


const beginNextRound = (state) => {
	state.communityCards = [];
	state.sidePots = [];
	state.playerHierarchy = [];
	state.showDownMessages = [];
	state.deck = shuffle(generateDeckOfCards())
	state.highBet = 20;
	state.betInputValue = 20;
	state.minBet = 20; 
	// Unmount all cards so react can re-trigger animations
	const { players } = state;
	const clearPlayerCards = players.map(player => ({...player, cards: player.cards.map(card => {})}))
	state.players = clearPlayerCards;
	return passDealerChip(state)
}

const checkWin = players => {
	return (players.filter(player => player.chips > 0).length === 1)
}


export { generateTable, handleOverflowIndex, determineNextActivePlayer, determinePhaseStartActivePlayer, beginNextRound, checkWin }