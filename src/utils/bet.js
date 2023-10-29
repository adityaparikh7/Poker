import { dealFlop, dealTurn, dealRiver, showDown } from './cards.js';
import { determineNextActivePlayer } from './players.js';

const determineBlindIndices = (dealerIndex, numPlayers) => {
	return({
		bigBlindIndex: (dealerIndex + 2) % numPlayers,
		smallBlindIndex: (dealerIndex + 1) % numPlayers,
	});
}

const anteUpBlinds = (players, blindIndices, minBet) => {
	const { bigBlindIndex, smallBlindIndex } = blindIndices;
	players[bigBlindIndex].bet = minBet;
	players[bigBlindIndex].chips = players[bigBlindIndex].chips - minBet;
	players[smallBlindIndex].bet = minBet / 2;
	players[smallBlindIndex].chips = players[smallBlindIndex].chips - (minBet / 2);
		return players
}

const determineMinBet = (highBet, playerChipsStack, playerBet) => {
	const playerTotalChips = playerChipsStack + playerBet
	if (playerTotalChips < highBet) {
		return playerTotalChips;
	} else {
		return highBet;
	}
}
const handleBet = (state, bet, min, max) => {
	if (bet < min) {
		state.betInputValue = min;
		return console.log("Invalid Bet")
	}
	if (bet > max) {
		state.betInputValue = max;
		return console.log("Invalid Bet")
	}

	if (bet > state.highBet) {
		// minbet and highbet may be condensed to a single property
		state.highBet = bet;
		state.minBet = state.highBet;
		for (let player of state.players) {
			if (!player.folded || !player.chips === 0) {
				player.betReconciled = false;
			}
		}
	}

		const activePlayer = state.players[state.activePlayerIndex];
		const subtractableChips = bet - activePlayer.bet;
		activePlayer.bet = bet;

		activePlayer.chips = activePlayer.chips - subtractableChips;
		if (activePlayer.chips === 0) {
			activePlayer.allIn = true;
			state.numPlayersAllIn++
		}
		activePlayer.betReconciled = true;
	return determineNextActivePlayer(state)
}

const handleFold = (state) => {
	const activePlayer = state.players[state.activePlayerIndex];
		activePlayer.folded = true;
		activePlayer.betReconciled = true;
		state.numPlayersFolded++
		state.numPlayersActive--

		const nextState = determineNextActivePlayer(state)
		return nextState
}

const handlePhaseShift = (state) => {
	switch(state.phase) {
		case('betting1'): {
			state.phase = 'flop';
			return dealFlop(reconcilePot(state));
		}
		case('betting2'): {
			state.phase = 'turn';
			return dealTurn(reconcilePot(state));
		}
		case('betting3'): {
			state.phase = 'river'
			return dealRiver(reconcilePot(state));
		}
		case('betting4'): {
			state.phase = 'showdown'
			return showDown(reconcilePot(state));
		}
		default: throw Error("handlePhaseShift() called from non-betting phase")
	}
}

const reconcilePot = (state) => {
	for (let player of state.players) {

		state.pot = state.pot + player.bet;

		player.sidePotStack = player.bet;
		player.betReconciled = false; // This is used as a marker to determine whether to adv to next round of betting
	}
	state = condenseSidePots(calculateSidePots(state, state.players));

	for (let player of state.players) {
		player.currentRoundChipsInvested += player.bet;
		player.bet = 0 // Reset all player bets to 0 for the start of the next round
	}

	state.minBet = 0; // Reset markers which control min/max bet validation
	state.highBet = 0;
	state.betInputValue = 0;
		return state
}

const calculateSidePots = (state, playerStacks) => {
	const investedPlayers = playerStacks.filter((player) => player.sidePotStack > 0);
	if (investedPlayers.length <= 1) {
		return state;
	}

	const smallStackValue = Math.min(...investedPlayers.map((player) => player.sidePotStack));

	const builtSidePots = investedPlayers.reduce((acc, player) => {
		if (!player.folded) {
			acc.contestants.push(player.name);
		}
		acc.potValue += smallStackValue;
		player.sidePotStack -= smallStackValue;
		return acc;
	}, { contestants: [], potValue: 0 });

	state.sidePots.push(builtSidePots);

	return calculateSidePots(state, investedPlayers);
};

// const condenseSidePots = (state) => {
// 	if (state.sidePots.length > 1) {
// 		for (let i = 0; i < state.sidePots.length; i++) {
// 			for (let n = i + 1; n < state.sidePots.length; n++ ) {
// 				if (arrayIdentical(state.sidePots[i].contestants, state.sidePots[n].contestants)) {
// 					state.sidePots[i].potValue = state.sidePots[i].potValue + state.sidePots[n].potValue;
// 					state.sidePots = state.sidePots.filter((el, index) => index !== n);
// 				}
// 			}
// 		}
// 	}
// 		return state	
// }

const condenseSidePots = (state) => {
	if (state.sidePots.length <= 1) {
		return state;
	}

	const condensedPots = state.sidePots.reduce((acc, pot) => {
		const existingPot = acc.find((p) => arrayIdentical(p.contestants, pot.contestants));
		if (existingPot) {
			existingPot.potValue += pot.potValue;
		} else {
			acc.push(pot);
		}
		return acc;
	}, []);

	return {
		...state,
		sidePots: condensedPots,
	};
};


const arrayIdentical = (arr1, arr2) => {

	if (arr1.length !== arr2.length) {
		return false
	}
		//return arr1.map(el => arr2.includes(el)).filter(bool => bool !== true).length !== 0 ? false : true;
		return arr1.every(el => arr2.includes(el));
}

export { 
	determineBlindIndices, 
	anteUpBlinds, 
	determineMinBet,
	handleBet,
	handleFold,
	handlePhaseShift,
	reconcilePot
}