// $('.message a').click(function(){
//    $('form').animate({height: "toggle", opacity: "toggle"}, "slow");
// });

function login(e) {
  e.preventDefault();
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  var raw = JSON.stringify({"username":document.getElementById('username').value,"password":document.getElementById('password').value});

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  fetch("/api/login", requestOptions)
    .then(response => response.text())
    .then(result => {
      let res = JSON.parse(result);
      if(res?.error) {
        alert(res?.message?.text)
      } else {
        localStorage.setItem('token',res.token+'')
        localStorage.setItem('username',res.username+'')
        window.location = '/files';
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