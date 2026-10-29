
	    const urlParams = new URLSearchParams(window.location.search);

	    const year = parseInt(urlParams.get('year'), 10) || null;
	    const month = parseInt(urlParams.get('month'), 10) || null;
	    const day = parseInt(urlParams.get('day'), 10) || null;

	    const date = new Date(year, month - 1, day);

	    const weekday = date.toLocaleDateString('en-US', {weekday: 'long'});
	    const longMonth = date.toLocaleDateString('en-US', {month: 'long'});

	    function checkErrors() {
		if (!year || !month || !day) {
		    return true;
		}

		return false;

	    }

	    function updateEventDate() {
		const element = document.getElementById("event-date");

		if (checkErrors()) {
		    element.innerHTML = "Error!";
		} else {
		    element.innerHTML = `Events for ${weekday}, ${longMonth} ${day}, ${year}`;
		}

	    }

	    function updateEvents() {
		const eventDate = `${year}/${month}/${day}`;

		const element = document.getElementById("events-list");

		const db = window.DB_EVENTS[eventDate];

		function sort(a, b) {
		    let adate = new Date(`${eventDate} ${a.start_time}`);
		    let bdate = new Date(`${eventDate} ${b.start_time}`);
		    return adate - bdate;
		}

		let eventList = [];
		if (db) {
		    eventList = Array.from(db);
		    eventList.sort(sort);
		}

		function createEvent(event) {
		    let image = "";
		    if (event.image) {
			image = `<img src="img/events/${event.image}"/>`;
		    }
		    let result =
			    `<div class="event-container">
				<div class="event-left">
				    <div class="event-title"><h3>${event.title}</h3></div>
				    <div>Date: ${event.start_date}</div>
				    <div>Time ${event.start_time} - ${event.end_time}</div>
				    <div>Location: ${event.address}</div>
				    <div>Additional Info: ${event.info}</div>
				</div>`;
		    result += `<div class="event-right">
				    ${image}
				</div>
			</div>`;
		    return result;
		}

		eventList.forEach(event => element.innerHTML += createEvent(event));
	    }

	    document.addEventListener("DOMContentLoaded", updateEventDate);
	    document.addEventListener("DOMContentLoaded", updateEvents);
