const apiKey = '82241364f04d44be324db56abdcd0c3a';
const weatherBaseURL = 'https://api.openweathermap.org/data/2.5/';

// Elements
const searchBtn = document.getElementById('searchBtn');
const currentlocBtn = document.getElementById('currentlocBtn');
const locationElement = document.getElementById('location');
const temperatureElement = document.getElementById('temperature');
const descriptionElement = document.getElementById('description');
const humidityElement = document.getElementById('Humid-val');
const windElement = document.getElementById('wind-val');
const windUnitElement = document.getElementById('wind-unit');
const pressureElement = document.getElementById('press-val');
const forecastElements = {
    today: document.getElementById('today-forecast'),
    tomorrow: document.getElementById('tomorrow-forecast'),
    dayAfterTomorrow: document.getElementById('day-after-tomorrow-forecast')
};
const weatherIcon = document.getElementById('weatherIcon');
const mapElement = document.getElementById('map');
const modal = document.getElementById('weather-alert-modal');
const closeModalBtn = document.getElementById('close-modal');
const alertMessage = document.getElementById('weather-alert-message');
const rainChartCanvas = document.getElementById('rainChart').getContext('2d');
let rainChart;

// Initialize map and event listeners when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the map
    const map = L.map(mapElement).setView([51.505, -0.09], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Event listeners
    searchBtn.addEventListener('click', () => fetchWeatherByLocation());
    currentlocBtn.addEventListener('click', () => getCurrentLocationWeather());
    closeModalBtn.addEventListener('click', () => closeModal());

    function fetchWeatherByLocation() {
        const cityOrZip = document.getElementById('loc').value;
        const unit = document.getElementById('unitSelect').value;
        if (cityOrZip) {
            const url = `${weatherBaseURL}weather?q=${cityOrZip}&units=${unit}&appid=${apiKey}`;
            fetchWeatherData(url);
        } else {
            alert("Please enter a city or zip code");
        }
    }

    function getCurrentLocationWeather() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const unit = document.getElementById('unitSelect').value;
                const url = `${weatherBaseURL}weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${apiKey}`;
                fetchWeatherData(url);
            }, () => {
                alert("Geolocation not supported or permission denied.");
            });
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    }

    function fetchWeatherData(url) {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                updateWeatherUI(data);
                fetchForecast(data.coord.lat, data.coord.lon);
                updateMap(data.coord.lat, data.coord.lon);
            })
            .catch(error => {
                console.error("Error fetching weather data:", error);
                alert("Failed to retrieve weather information. Please check the console for details.");
            });
    }

    function updateWeatherUI(data) {
        locationElement.innerText = `${data.name}, ${data.sys.country}`;
        temperatureElement.innerText = `Temperature: ${Math.round(data.main.temp)}°`;
        descriptionElement.innerText = `${data.weather[0].description}`;
        humidityElement.innerText = `${data.main.humidity}%`;
        windElement.innerText = `${data.wind.speed} ${document.getElementById('unitSelect').value === 'metric' ? 'km/h' : 'mph'}`;
        pressureElement.innerText = `${data.main.pressure} hPa`;
        weatherIcon.src = `http://openweathermap.org/img/wn/${data.weather[0].icon}.png`;

        // Check for weather alerts
        if (data.alerts && data.alerts.length > 0) {
            alertMessage.innerText = data.alerts[0].description;
            modal.style.display = 'block';
        } else {
            modal.style.display = 'none'; // Hide the modal if no alerts
        }
    }

    function fetchForecast(lat, lon) {
        const unit = document.getElementById('unitSelect').value;
        const forecastUrl = `${weatherBaseURL}forecast?lat=${lat}&lon=${lon}&units=${unit}&appid=${apiKey}`;
        fetch(forecastUrl)
            .then(response => response.json())
            .then(data => {
                updateForecast(data);
                updateHourlyForecast(data); // Update the hourly forecast
                updateRainChart(data); // Update the rain chart
            })
            .catch(error => console.error("Error fetching forecast:", error));
    }

    function updateForecast(data) {
        const forecastByDay = data.list.filter(item => {
            const date = new Date(item.dt_txt);
            return date.getHours() === 12; // Midday forecast
        });

        if (forecastByDay.length > 0) {
            forecastElements.today.innerText = forecastByDay[0].weather[0].description;
        }
        if (forecastByDay.length > 1) {
            forecastElements.tomorrow.innerText = forecastByDay[1].weather[0].description;
        }
        if (forecastByDay.length > 2) {
            forecastElements.dayAfterTomorrow.innerText = forecastByDay[2].weather[0].description;
        }
    }

    function updateHourlyForecast(data) {
        const hourlyForecastContainer = document.querySelector('.hourly-forecast');
        const hourlyForecasts = data.list.filter(item => {
            const date = new Date(item.dt_txt);
            return date.getMinutes() === 0; // Hourly data
        });

        const tbody = hourlyForecastContainer.querySelector('tbody');
        tbody.innerHTML = ''; // Clear existing content

        hourlyForecasts.forEach((item, index) => {
            const date = new Date(item.dt_txt);
            const hour = date.getHours();
            const temperature = Math.round(item.main.temp);
            const description = item.weather[0].description;
            const icon = item.weather[0].icon;
            const windSpeed = item.wind.speed;
            const humidity = item.main.humidity;
            const rainChance = item.pop * 100; // Calculate rain chance from probability

            const rowClass = index >= 5 ? 'hidden-row' : ''; // Add 'hidden-row' class if index >= 5

            const forecastHTML = `
                <tr class="${rowClass}">
                    <td>${hour}:00</td>
                    <td><img src="http://openweathermap.org/img/wn/${icon}.png" alt="${description}"></td>
                    <td>${temperature}°</td>
                    <td>${description}</td>
                    <td>${rainChance}%</td>
                </tr>
            `;

            tbody.innerHTML += forecastHTML;
        });

        // Update the "View More" button
        updateViewMoreButton();
    }

    function updateViewMoreButton() {
        const viewMoreBtn = document.getElementById('view-more-btn');
        const hiddenRows = document.querySelectorAll('.hourly-forecast tbody .hidden-row');
        
        // Initially hide all rows that should be hidden
        hiddenRows.forEach(row => row.style.display = 'none');

        // Show the button only if there are hidden rows
        if (hiddenRows.length > 0) {
            viewMoreBtn.style.display = 'block'; // Show the button if there are hidden rows
            viewMoreBtn.textContent = 'View More'; // Set initial button text

            viewMoreBtn.addEventListener('click', () => {
                // Check the current state and toggle accordingly
                if (viewMoreBtn.textContent === 'View More') {
                    hiddenRows.forEach(row => row.style.display = ''); // Show all hidden rows
                    viewMoreBtn.textContent = 'View Less'; // Update button text
                } else {
                    hiddenRows.forEach(row => row.style.display = 'none'); // Hide all rows
                    viewMoreBtn.textContent = 'View More'; // Update button text
                }
            });
        } else {
            viewMoreBtn.style.display = 'none'; // Hide the button if there are no hidden rows
        }
    }

    function updateRainChart(data) {
        const labels = [];
        const rainChances = [];

        data.list.forEach(item => {
            const date = new Date(item.dt_txt);
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
            const rainChance = item.pop * 100; // Probability of precipitation

            // Check if we already have an entry for this date
            const index = labels.indexOf(formattedDate);
            if (index === -1) {
                labels.push(formattedDate);
                rainChances.push(rainChance);
            } else {
                rainChances[index] = Math.max(rainChances[index], rainChance); // Take max chance for the day
            }
        });

        // Destroy old chart instance if it exists
        if (rainChart) {
            rainChart.destroy();
        }

        // Create a new chart
        rainChart = new Chart(rainChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Rain Chances (%)',
                    data: rainChances,
                    backgroundColor: 'rgb(27, 58, 34, 0.2)',
                    borderColor: 'rgba(0, 255, 0, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Chance of Rain (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    }

    function updateMap(lat, lon) {
        map.setView([lat, lon], 10);
        L.marker([lat, lon]).addTo(map).bindPopup('Weather location').openPopup();
    }

    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Re-enable scrolling
    }

    // Example usage: Automatically get current weather on load
    getCurrentLocationWeather();
});