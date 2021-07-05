fs = require('fs');

function userFiles(enterUser,b){
  if(!b || b.length == 0) return [];
  let a = b.trim()
  console.log('a: ',a)
  console.log('a: ',a.length)
  fs.writeFile('helloworld.txt', a, function (err) {
    if (err) return console.log(err);
  });

  let y = a.split("\n\n")
  let final = []
  let files = []
  // let enterUser = "jimmij"
  for(let i of y){
    let c = i.split("\n")
    let fileName = c[0].split(' ')[2]
    let owner = c[1].split(' ')[2]
    let group = c[2].split(' ')[2]
    let user = c[3].split('::')[1]

    for(let j of c){
      let ownertInfo = []
      let userInfo = []
      if(j.startsWith("user:")){
        if(j.includes("::")){
          if(j.split('::')[1].split("")[0] == "r"){
            ownertInfo.push(owner,fileName)
            final.push(ownertInfo)
          }
        }
        else{
          let specialUserInfo = []
          let specialUserName = j.split(':')[1]
          let specialUserPerm = j.split(':')[2]
          if(specialUserPerm.split("")[0] == "r"){
            specialUserInfo.push(specialUserName,fileName)
            final.push(specialUserInfo)
          }
        }
      }
    }
  }
  // console.log(final)
  for (let a of final){
      if (enterUser == a[0]){
        // console.log(a[1])
        files.push(a[1])
      }
  }
  // console.log(files)
  return files
}
// let a = `# file: files/test.txt
// # owner: parallels
// # group: parallels
// user::rw-
// user:sooji:r--
// group::rw-
// mask::rw-
// other::r--`
// console.log(userFiles('sooji',a))

module.exports = userFiles;