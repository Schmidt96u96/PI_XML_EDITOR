import { Component, OnInit } from '@angular/core';
import {AuthenticationService} from '../services/authentication.service'
@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {

  constructor(authenticationService: AuthenticationService) { }

  ngOnInit() {
  }

}