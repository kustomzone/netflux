import {WebChannelManagerInterface} from 'service/webChannelManager/webChannelManager'

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
	    wc.channels.forEach((c) => peerIds.add(c.peerId))
	    wc.getJoiningPeers().forEach((jp) => {
		    if (channel.peerId !== jp.id && !peerIds.has(jp.id)) {
		        jpIds.add(jp.id)
		    }
	    })
	    return this.connectWith(wc, channel.peerId, channel.peerId, [...peerIds], [...jpIds])
	}

	broadcast(webChannel, data) {
		let d
	    for (let c of webChannel.channels) {
	      d = (typeof window === 'undefined') ? data.slice(0) : data
	      c.send(d)
	    }
	}

	sendTo(id, webChannel, data) {
		for (let kp of webChannel.channels.knownPeers) {
			if (kp != 'undefined') {
				if (kp.peerId === id) {
					webChannel.channels.forEach((c) => {
						if (c.peerId === id) {
							c.send(data)
						}
					})
				return
				}
			}
		}
	}

	shuffle(webChannel) {
		// let partialView
		let oldest = webChannel.channels.knownPeers[0]
		let sample

		//increment age
		webChannel.channels.knownPeers.forEach((kp) => { if (kp != 'undefined') { kp.peerAge = kp.peerAge + 1 } })

		//getoldest
		webChannel.channels.knownPeers.forEach((kp) => {
			if (kp != 'undefined') {
				if (kp.peerAge > oldest.peerAge) { oldest = kp }
			}
		})

		// if oldest is unreachable handle it and repeat process

		// select half of the neighbors excluding one occurrence of oldest
		// partialView = webChannel.channels.knownPeers
		// partialView[partialView.indexOf(oldest)] = {peerId: webChannel.myId, peerAge: 0}
		sample = webChannel.getSample(webChannel.channels.knownPeers, Math.ceil(webChannel.channels.knownPeers.length / 2) -1)

		// replace oldest occurrences with itself occurrences and send it to oldest
		sample.forEach((kp) => {
			if (kp.peerId === oldest.peerId) {
				kp.peerId = webChannel.myId
			}
		})

		// add one occurrence of itself to this sample
		sample.push({peerId: webChannel.myId, peerAge: 0})

		console.log('myId :', webChannel.myId)
		console.log('knownPeers: ', webChannel.channels.knownPeers)
		console.log('oldest: ', oldest)
		console.log('sample :', sample)

		webChannel.sendToPeerForShuffle(oldest.peerId, {origin: webChannel.myId, sample})
		// this.sendTo(oldest.peerId, webChannel, JSON.stringify(sample))

		// get response of oldest

		sample.forEach((kp) => {
			if (kp.peerId === webChannel.myId) {
				kp.peerId = oldest.peerId
			}
		})

		// delete the sample sent to oldest
		let isDeleted
		for (let i = 0 ; i < sample.length ; i++) {
			isDeleted = false
			for (let j = 0 ; j < webChannel.channels.knownPeers.length ; j++) {
				if (webChannel.channels.knownPeers[j] != 'undefined') {
					if (!isDeleted && webChannel.channels.knownPeers[j].peerId === sample[i].peerId 
					  && webChannel.channels.knownPeers[j].peerAge === sample[i].peerAge) {
						delete webChannel.channels.knownPeers[j]
						isDeleted = true
					}
				}
			}
		}

		webChannel.channels.knownPeers.sort()
		webChannel.channels.knownPeers.length = webChannel.channels.knownPeers.length - sample.length

		console.log('new knownPeers: ', webChannel.channels.knownPeers)
		// remove an occurrence of oldest
	}

	onExchange(webChannel, originId, sample) {
		let responseSample = webChannel.getSample(webChannel.channels.knownPeers, Math.ceil(webChannel.channels.knownPeers.length / 2))

		console.log('myId', webChannel.myId, 'knownPeers: ', webChannel.channels.knownPeers)

		// replace origin occurrences with itself occurrences and send it to origin
		responseSample.forEach((kp) => {
			if (kp.peerId === originId) {
				kp.peerId = webChannel.myId
			}
		})

		console.log('myId', webChannel.myId, 'answer :', responseSample)

		webChannel.sendToPeerForShuffleAnswer(originId, responseSample)

		responseSample.forEach((kp) => {
			if (kp.peerId === webChannel.myId) {
				kp.peerId = originId
			}
		})

		let isDeleted
		for (let i = 0 ; i < responseSample.length ; i++) {
			isDeleted = false
			for (let j = 0 ; j < webChannel.channels.knownPeers.length ; j++) {
				if (webChannel.channels.knownPeers[j] != 'undefined') {
					if (!isDeleted && webChannel.channels.knownPeers[j].peerId === responseSample[i].peerId 
					  && webChannel.channels.knownPeers[j].peerAge === responseSample[i].peerAge) {
						delete webChannel.channels.knownPeers[j]
						isDeleted = true
					}
				}
			}
		}

		webChannel.channels.knownPeers.sort()
		webChannel.channels.knownPeers.length = webChannel.channels.knownPeers.length - sample.length
		
		webChannel.channels.knownPeers.concat(sample)

		console.log('myId', webChannel.myId, 'new knownPeers apres concat: ', webChannel.channels.knownPeers)
	}

	leave(webChannel) {}
}

export default SprayService
