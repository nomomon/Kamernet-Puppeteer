// DON'T FORGET TO ADJUST YOUR SAVED SEARCH SETTINGS, AND SET A SAVED MESSAGE! ./README.md

export default {
    USERNAME: "", // kamernet email
    PASSWORD: "", // kamernet password
    CITY: "delft", // the city name you are looking for (this should be in the url when you perform a search

    TIME_INTERVAL_MINUTES: 2, // time interval in which it sends messages (min),
    TIMEOUT_MINUTES: Infinity, // time after the interval stops (Can be Infinity)
    PAGE_COUNT: 2 // the number of pages to fetch and send responses to
};
