#include<iostream>
#include<string>
using namespace std;
int solve(){
  string s;
  cin>>s;
  string prevString = "";
  int count=0;
  for(int i=0;i<s.size();i++){
    int subString = s.substr(0,2);
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