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

	const response = await axios.get(`https://randomuser.me/api/?results=4&nat=in`);
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

const generatePersonality = (seed) => {
	switch(seed) {
		case (seed > 0.5): 
			return 'standard'
		case (seed > 0.35): 
			return 'aggressive'
		case (seed > 0):
		default: 
			return 'conservative'
	}
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
		default: throw Error("Attempted to overfow index on unfamiliar direction");
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


// This function can lead to errors if player all ins at a certain position
// final AI will freeze
// seems to happen when only 2 players left and someone has all-in

const determineNextActivePlayer = (state) => {
	state.activePlayerIndex = handleOverflowIndex(state.activePlayerIndex, 1, state.players.length, 'up');
	const activePlayer = state.players[state.activePlayerIndex];

	const allButOnePlayersAreAllIn = (state.numPlayersActive - state.numPlayersAllIn === 1);
	if (state.numPlayersActive ===  1) {
		console.log("Only one player active, skipping to showdown.")
		return(showDown(reconcilePot(dealMissingCommunityCards(state))));
	}
	if (activePlayer.folded) {
		console.log("Current player index is folded, going to next active player.")
		return determineNextActivePlayer(state);
	}

	if (
		allButOnePlayersAreAllIn &&
		!activePlayer.folded &&
		activePlayer.betReconciled
	) {
		return(showDown(reconcilePot(dealMissingCommunityCards(state))));
	}

	if (activePlayer.chips === 0) {
		if (state.numPlayersAllIn === state.numPlayersActive) {
			console.log("All players are all in.")
			return(showDown(reconcilePot(dealMissingCommunityCards(state))));
		} else if (allButOnePlayersAreAllIn && activePlayer.allIn) {
			return(showDown(reconcilePot(dealMissingCommunityCards(state))));
		} else {
			return determineNextActivePlayer(state);
		}
	}

	//after all bets are accepted this will move the game to next round
	if (activePlayer.betReconciled) {
		//console.log("Player is reconciled with pot, round betting cycle complete, proceed to next round.")
		return handlePhaseShift(state);
	}

	return state
}


const passDealerChip = (state) => {
	// This is messy because we are determining active player, dealer, and blinds based on an arbitrary index, not with flags on player entries.
	// When we remove all players who have ran out of chips, the new indices will not match up cleanly. We need to find the index of the player, keep track of who it is or 
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
	state.minBet = 20; // can export out to initialState
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