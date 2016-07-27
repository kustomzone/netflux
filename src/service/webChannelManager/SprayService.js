import {WebChannelManagerInterface} from 'service/webChannelManager/webChannelManager'
import ChannelBuilderService from 'service/channelBuilder/ChannelBuilderService'

/**
 * Spray web channel manager. Implements spray topology
 * network, when each peer is connected to ln(N) other peers.
 *
 * @extends module:webChannelManager~WebChannelManagerInterface
 */
class SprayService extends WebChannelManagerInterface {

	constructor() {
		super()
	}

	add(channel) {
		let wc = channel.webChannel
	    let peerIds = new Set([wc.myId])
	    let jpIds = new Set()
	    for (let i = 0 ; i < wc.knownPeers.length ; i++) {
	    	peerIds.add(wc.knownPeers[i].peerId)
	    }
	    // wc.getJoiningPeers().forEach((jp) => {
		   //  if (channel.peerId !== jp.id && !peerIds.has(jp.id)) {
		   //      jpIds.add(jp.id)
		   //  }
	    // })
	    // console.log('joiningPeers:', jpIds)
	    return this.connectWith(wc, channel.peerId, channel.peerId, [...peerIds], [...jpIds])
	}

	broadcast(webChannel, data) {
		// actual : broadcast from fully_connected...
		let d
	    for (let c of webChannel.channels) {
	      d = (typeof window === 'undefined') ? data.slice(0) : data
	      c.send(d)
	    }
	}

	sendTo(id, webChannel, data) {
		// console.log('from', webChannel.myId, 'to', id)
		let directChannelExists = false
		let isKnownPeer = false
		let channelExists = false
		let randIndex = Math.ceil(Math.random() * webChannel.knownPeers.length) - 1
		for (let kp of webChannel.knownPeers) {
			if (typeof kp !== 'undefined') {
				if (kp.peerId === id) {
					isKnownPeer = true
				}
			}
		}

		if (!isKnownPeer) {
			webChannel.channels.forEach((c) => {
				if (c.peerId === id) {
					channelExists = true
					return
				}
			})
			if (channelExists) {
				directChannelExists = true
			}
		} else {
			directChannelExists = true
		}

		if (directChannelExists) {
			webChannel.channels.forEach((c) => {
				if (c.peerId === id) {
					c.send(data)
					return
				}
			})
		} else {
			webChannel.forwardMsg(id, data, webChannel.knownPeers[randIndex].peerId)
		}
	}

	shuffle(webChannel) {
		// let partialView
		let oldest = webChannel.knownPeers[0]
		let sample
		let isDeleted

		console.log()
		console.log('------ Shuffle ------')

		//increment age
		webChannel.knownPeers.forEach((kp) => { if (typeof kp !== 'undefined') { kp.peerAge = kp.peerAge + 1 } })

		//getoldest
		webChannel.knownPeers.forEach((kp) => {
			if (typeof kp !== 'undefined') {
				if (kp.peerAge > oldest.peerAge) { oldest = kp }
			}
		})

		// if oldest is unreachable handle it and repeat process

		// select half of the neighbors excluding one occurrence of oldest
		sample = webChannel.getSample(webChannel.knownPeers, Math.ceil(webChannel.knownPeers.length / 2) -1)


		console.log('sample :', sample)

		// replace oldest occurrences with itself occurrences
		sample.forEach((kp) => {
			if (kp.peerId === oldest.peerId) {
				kp.peerId = webChannel.myId
			}
		})

		// add one occurrence of itself to this sample and send this sample to oldest
		sample.push({peerId: webChannel.myId, peerAge: 0})

		console.log('myId :', webChannel.myId)
		console.log('knownPeers: ', webChannel.knownPeers)
		console.log('oldest: ', oldest)
		console.log('sample :', sample)

		webChannel.sendToPeerForShuffle(oldest.peerId, {origin: webChannel.myId, sample})

		// replace itself occurrences with oldest occurrences and delete the sample from the partial view
		sample.forEach((kp) => {
			if (kp.peerId === webChannel.myId) {
				kp.peerId = oldest.peerId
			}
		})

		for (let i = 0 ; i < sample.length ; i++) {
			isDeleted = false
			for (let j = 0 ; j < webChannel.knownPeers.length ; j++) {
				if (typeof webChannel.knownPeers[j] !== 'undefined') {
					console.log(webChannel.knownPeers[j])
					if (!isDeleted && webChannel.knownPeers[j].peerId === sample[i].peerId ) {
						delete webChannel.knownPeers[j]
						// console.log('myId :', webChannel.myId, 'deleted :', sample[i].peerId)
						isDeleted = true
					}
				}
			}
		}

		// some lines to avoid undefined elements
		webChannel.knownPeers.sort()
		webChannel.knownPeers.length = webChannel.knownPeers.length - sample.length

		console.log('new knownPeers: ', webChannel.knownPeers)
	}

	onExchange(webChannel, originId, sample) {
		let responseSample = webChannel.getSample(webChannel.knownPeers, Math.ceil(webChannel.knownPeers.length / 2))
		let isDeleted

		console.log()
		console.log('------ onExchange ------')
		console.log('myId', webChannel.myId, 'knownPeers: ', webChannel.knownPeers)
		console.log('received sample:', sample, 'origin:', originId)

		// replace origin occurrences with itself occurrences and send the response to origin
		responseSample.forEach((kp) => {
			if (kp.peerId === originId) {
				kp.peerId = webChannel.myId
			}
		})

		console.log('myId', webChannel.myId, 'answer :', responseSample, 'dest:', originId)
		console.log('knownpeers', webChannel.knownPeers)

		webChannel.sendToPeerForShuffleAnswer(originId, responseSample)

		// replace itself occurrences with origin occurrences and delete the sample from the partial view
		responseSample.forEach((kp) => {
			if (kp.peerId === webChannel.myId) {
				kp.peerId = originId
			}
		})

		for (let i = 0 ; i < responseSample.length ; i++) {
			isDeleted = false
			for (let j = 0 ; j < webChannel.knownPeers.length ; j++) {
				if (typeof webChannel.knownPeers[j] !== 'undefined') {
					// TODO: Il est possible que le check de l'age pose problème. A tester
					if (!isDeleted && webChannel.knownPeers[j].peerId === responseSample[i].peerId 
					  && webChannel.knownPeers[j].peerAge === responseSample[i].peerAge) {
						delete webChannel.knownPeers[j]
						// console.log('myId :', webChannel.myId, 'deleted :', responseSample[i].peerId)
						isDeleted = true
					}
				}
			}
		}

		// some lines to avoid undefined elements
		webChannel.knownPeers.sort()
		webChannel.knownPeers.length = webChannel.knownPeers.length - responseSample.length

		// add the sample send by the origin to the partial view
		webChannel.knownPeers = webChannel.knownPeers.concat(sample)
		console.log('new knownpeers', webChannel.knownPeers)

		this.updateChannels(webChannel)

		console.log('channels', webChannel.channels)
	}

	onShuffleEnd(webChannel, sample) {
		console.log()
		console.log('------ onShuffleEnd ------')
		console.log('myId', webChannel.myId, 'knownPeers: ', webChannel.knownPeers)
		webChannel.knownPeers = webChannel.knownPeers.concat(sample)
		console.log('myId', webChannel.myId, 'new knownPeers: ', webChannel.knownPeers)
		this.updateChannels(webChannel)
		console.log('myId', webChannel.myId, 'new channels: ', webChannel.channels)
	}

	updateChannels(webChannel) {
		// console.log('WC:', webChannel.myId, webChannel.knownPeers)
		let isKnown
		let hasChannel
		let cBlder = new ChannelBuilderService()
		for (let i = 0 ; i < webChannel.knownPeers.length ; i++) {
			hasChannel = false
			for (let c of webChannel.channels) {
				console.log(c.peerId, webChannel.knownPeers[i].peerId)
				if (c.peerId === webChannel.knownPeers[i].peerId) {
					hasChannel = true
					break
				}
			}
			if (!hasChannel) {
				// create a new channel
				console.log('I am trying to connect to', webChannel.knownPeers[i].peerId, '... Please wait.')
				// this.connectWith(webChannel, webChannel.knownPeers[i].peerId, null, new Set([webChannel.myId]), new Set())
				cBlder.connectMeTo(webChannel, webChannel.knownPeers[i].peerId)
			}
		}

		for (let c of webChannel.channels) {
			// console.log(webChannel.myId, c)
			isKnown = false
			for (let i = 0 ; i < webChannel.knownPeers.length ; i++) {
				if (webChannel.knownPeers[i].peerId === c.peerId) {
					isKnown = true
					break
				}
			}
			if (!isKnown && webChannel.channels.size > 1) {
				webChannel.channels.delete(c)
			}
		}
	}

	leave(webChannel) {}
}

export default SprayService
