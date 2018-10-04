let restaurant;
let reviews;
let offlineReview;
let visibleOfflineReview = false;
var map;

document.addEventListener('DOMContentLoaded', (event) => {
  fetchRestaurantFromURL((error, fetchedRestaurant) => {
    if(error) {
      console.error(error);
      return;
    }

    DBHelper.getOfflineReviewByRestaurantId(fetchedRestaurant.id, (error, review) => {
      if(!error && review) {
        offlineReview = review;
        postReview();
      }
    });

    fillBreadcrumb();
  });


  document.getElementById('review-form').addEventListener('submit', event => {
    const form = event.target;
    const formData = {
      restaurant_id: self.restaurant.id,
      name: form[0].value,
      rating: form[1].value,
      comments: form[2].value
    }

    fetch('http://localhost:1337/reviews/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    .then(() => {
      window.location.reload(false);
    })
    .catch(error => {
      if(error.message === 'Failed to fetch') {
        DBHelper.saveOfflineReview(formData)
        offlineReview = formData;

        createOfflineReviewHTML();

        setTimeout(postReview, 10000);
      }
    });

    event.preventDefault();
  });

  setTimeout(addMap, 1200);
});

addMap = () => {
  const map = document.createElement('script');
  map.src = 'https://maps.googleapis.com/maps/api/js?libraries=places&callback=initMap';

  document.body.append(map);

  /**
   * Initialize Google map, called from HTML.
   */
  window.initMap = () => {
    fetchRestaurantFromURL((error, restaurant) => {
      if (error) { // Got an error!
        console.error(error);
      } else {
        self.map = new google.maps.Map(document.getElementById('map'), {
          zoom: 16,
          center: restaurant.latlng,
          scrollwheel: false
        });
        DBHelper.mapMarkerForRestaurant(restaurant, self.map);
      }
    });
  }
}

postReview = () => {
  fetch('http://localhost:1337/reviews/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(offlineReview)
  })
  .then(() => {
    DBHelper.deleteOfflineReviewByRestaurantId(offlineReview.restaurant_id, (error) => {
      if(!error) {
        window.location.reload(false);
      }
    });
  })
  .catch(error => {
    if(error.message === 'Failed to fetch') {
      if(!visibleOfflineReview) {
        createOfflineReviewHTML();
        visibleOfflineReview = true;
      }

      setTimeout(postReview, 10000);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');

  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;

      if (!restaurant) {
        console.error(error);
        return;
      }

      DBHelper.getReviewsById(id, (error, reviews) => {
        self.reviews = reviews;
        if (!reviews) {
          console.error(error);
          return;
        }
        fillRestaurantHTML();
        callback(null, restaurant)
      });
    });

  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Image of restaurant ${restaurant.name}`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

createOfflineReviewHTML = () => {
  const container = document.getElementById('offline-review-container');
  const reviewContainer = document.createElement('aside');
  const nameStatus = document.createElement('div');
  const name = document.createElement('p');
  name.className = 'name';
  name.innerHTML = offlineReview.name;
  nameStatus.appendChild(name);

  const status = document.createElement('p');
  status.classList = 'offline-review';
  status.innerHTML = 'Offline';
  nameStatus.appendChild(status);

  reviewContainer.appendChild(nameStatus);

  const rating = document.createElement('p');
  rating.className = 'rating';
  rating.innerHTML = `Rating: ${offlineReview.rating}`;
  reviewContainer.appendChild(rating);

  const comments = document.createElement('p');
  comments.className = 'comments';
  comments.innerHTML = offlineReview.comments;
  reviewContainer.appendChild(comments);

  container.appendChild(reviewContainer);

  visibleOfflineReview = true;
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const nameDate = document.createElement('div');
  const name = document.createElement('p');
  name.className = 'name';
  name.innerHTML = review.name;
  nameDate.appendChild(name);

  const date = document.createElement('time');
  const dateData = new Date(review.updatedAt).toLocaleDateString('en-US', {day: 'numeric', year: 'numeric', month: 'short'});
  date.innerHTML = dateData;
  date.setAttribute('datetime', dateData);
  nameDate.appendChild(date);

  li.appendChild(nameDate);

  const rating = document.createElement('p');
  rating.className = 'rating';
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.className = 'comments';
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
