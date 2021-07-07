// $('.message a').click(function(){
//    $('form').animate({height: "toggle", opacity: "toggle"}, "slow");
// });

function putList(list, id) {
  let html = "";
  let data = list ?? [];
  for (item of data) {
    html += `<li>${item}</li>`;
  }
  document.getElementById(id).innerHTML = html;
}

function api(url, getString, htmlId) {
  return function() {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    var requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };
    fetch(`/api/${url}`, requestOptions)
      .then((response) => response.text())
      .then((result) => {
        let res = JSON.parse(result);
        if (res?.error) {
          alert(res?.message?.text);
        } else {
          let strings = []
          let dt = res?.data ?? [];

          for(d of dt) {
            strings.push(getString(d))
          }
          putList(strings,htmlId);
        }
      })
      .catch((error) => {
        let data = error?.message?.text;
        console.log(data);
        alert(data);
        console.log("error", error);
      });
  }
}

api('log/combos',(r)=>`${r?.count} -> ${r?.username}, ${r?.password}`,'combos')()
api('log/username',(r)=>`${r?.count} -> ${r?.username}`,'logins')()
api('log/password',(r)=>`${r?.count} -> ${r?.password}`,'passwords')()
api('log/country',(r)=>`${r?.count} -> ${r?.country}`,'countries')()
api('log/total',(r)=>`${r?.['count(*)']}`,'records')()
api('log/last',(r)=>`username: ${r?.username}<br/>pass: ${r?.password}<br/>ip: ${r?.ip}<br/>date: ${new Date(r?.date)}<br/>country: ${r?.country}`,'lastcon')()

