#include<bits/stdc++.h>
using namespace std;
int solve(){
  string s;
  cin>>s;
  string prevString = "";
  int count=0;
  for(int i=0;i<s.size();i++){
    string subString = s.substr(i,2);
    if(subString!=prevString){
      count++;
      prevString=subString;
    }
  }
  cout<<count;
}
int main(){
  int t;
  while(t--){
    solve();
  }
  return 0;
}