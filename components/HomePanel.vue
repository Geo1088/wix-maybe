<template>
	<section class="panel home-panel">
		<div class="battle-actions">
			<h2>Create a room</h2>
			<form @submit.prevent="createRoom">
				<input
					type="text"
					placeholder="Room Name"
					v-model="createRoomForm.name"
				/>
				<input
					type="text"
					placeholder="Password (optional)"
					v-model="createRoomForm.password"
				/>
				<input type="submit" value="Create Room">
			</form>
			<h2>Rooms</h2>
			<ul class="rooms-list">
				<li
					v-for="room in allRooms"
					:key="room.id"
					class="rooms-list-item"
				>
					<a
						href="#"
						@click="isInRoom(room.id) ? $parent.showRoom(room.id) : joinRoom(room.id)"
					>
						<span class="name">{{room.name}} {{isInRoom(room.id) ? '(Joined)' : ''}}</span>
						<span v-if="room.hasPassword" class="info has-password">Has password</span>
						<span class="info members">{{room.members.length}} member{{room.members.length === 1 ? '' : 's'}}</span>
					</a>
				</li>
			</ul>
		</div>
		<div class="related-actions">
			<h2>Links</h2>
			<ul>
				<li><a href="/about">About Batoru</a></li>
			</ul>
		</div>
	</section>
</template>

<script>
export default {
	props: ['allRooms', 'joinedRooms'],
	data () {
		return {
			createRoomForm: {
				name: '',
				password: ''
			}
		}
	},
	methods: {
		joinRoom (id) {
			const room = this.allRooms.find(room => room.id === id)
			let password
			if (room.hasPassword) {
				password = window.prompt('Room password?')
				if (password == null) return // prompt returns null if cancelled
			}
			this.$socket.emit('joinRoom', {id, password}, ({error, room}) => {
				if (error) return window.alert(error)
				this.$parent.joinedRooms.push(room)
				this.$parent.showRoom(room.id)
			})
		},
		createRoom () {
			this.$socket.emit('createRoom', this.createRoomForm, ({error, room}) => {
				if (error) return window.alert(error)
				this.$parent.joinedRooms.push(room)
				this.$parent.showRoom(room.id)
			})
		},
		isInRoom (roomId) {
			return this.joinedRooms.find(r => r.id === roomId)
		}
	}
}
</script>

<style>
.rooms-panel {
	display: grid;
	grid:
		"tabs" 33px
		"main" calc(100% - 33px)
		/ 100%;
	border-left: 0;
}

.rooms-panel .rooms-tabs {
	grid-area: tabs;
	display: flex;
	align-items: stretch;
	border-bottom: 1px solid #BBB;
	padding: 0 5px;
	background: #F7F7F7;
}

.rooms-list-view {
	padding: 10px;
}
.rooms-list:not(:empty) {
	border: 1px solid #DDD;
	padding: 0;
	list-style: none;
}
.rooms-list-view .rooms-list-item + .rooms-list-item {
	border-top: 1px solid #DDD;
}
.rooms-list .rooms-list-item a {
	display: block;
	padding: 5px 10px;
}
.rooms-list .rooms-list-item .info:before {
	content: " - "
}

.home-panel {
	overflow-y: auto;
	display: flex;
}
.battle-actions {
	flex: 1 1 100%;
	padding: 10px 0 10px 10px;
}
.related-actions {
	flex: 0 1 200px;
	float: right;
	margin: 10px;
	padding: 10px;
	border: 1px solid #DDD;
	border-radius: 5px;
	background: #EEE;
}
.related-actions h2 {
	margin: 0;
	font-size: inherit;
}
.related-actions ul {
	margin: 5px 0 0;
	padding-left: 20px;
}
</style>
