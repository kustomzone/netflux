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

	}

	broadcast(webChannel, data) {

	}

	sendTo(id, webChannel, data) {

	}

	leave(webChannel) {}
}

export default SprayService
