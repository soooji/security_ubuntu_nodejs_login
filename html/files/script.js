// $('.message a').click(function(){
//    $('form').animate({height: "toggle", opacity: "toggle"}, "slow");
// });

function files() {
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  // var raw = JSON.stringify({"username":document.getElementById('username').value,"password":document.getElementById('password').value});

  var requestOptions = {
    method: 'GET',
    headers: myHeaders,
    // body: raw,
    redirect: 'follow'
  };
  let token = localStorage.getItem('token');
  if(!token) return window.location = '/login';

  fetch(`/api/file?secret_token=${token}`, requestOptions)
    .then(response => response.text())
    .then(result => {
      let res = JSON.parse(result);
      if(res?.error) {
        alert(res?.message?.text)
      } else {
        let html = ''
        let data = res?.data ?? [];
        for(item of data) {
          html+=`<li>${item}</li>`
        }
        document.getElementById('files').innerHTML = html;
      }
    })
    .catch(error => {
      let data = error?.message?.text;
      console.log(data)
      alert(data)
      console.log('error', error)
      }
    );
}

files();

function logout() {
  localStorage.clear();
  window.location = '/login'
}