# features/simple_math.feature
Feature: Successfully authenticates and gets a file
	In order to download a file
	As a user
	I want to get a URl that contains a correct authentication token

	Scenario: Successfully authenticates
		Given the correct environmental variables have been set
		When I authenticate with B2
		Then I am Successfully authenticated

	Scenario: Get file
		Given the correct environmental variables have been set
		When I authenticate with B2
		And I request 'testfile'
		Then I should receive a URL with an authentication token
		And I can successfully download the file