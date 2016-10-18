'use strict'
module.exports = class Validate {
	static Region(region) {
		return !!region && region.length && ['kr','na','euw','eune','oce','br','ru','las','lan','tr'].indexOf(region) > -1
	}

	static SummonerName(name) {
		return !!name && name.length && name.length < 16 && name.length > 3
	}

	static GameId(gameid) {
		return !!gameid && gameid.length && gameid % 1 == 0 && parseInt(gameid) >= 1000000000
	}

	static SummonerId(id) {
		return !!id && id.length && id >= 10000
	}
}